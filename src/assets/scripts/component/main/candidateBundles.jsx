'use strict';
/**
 * Candidate Bundles
 *
 * @package     MHW Calculator
 * @author      Scar Wu
 * @copyright   Copyright (c) Scar Wu (http://scar.tw)
 * @link        https://github.com/scarwu/MHWCalculator
 */

// Load Libraries
import React, { Component } from 'react';
import MD5 from 'md5';

// Load Core Libraries
import Event from 'core/event';

// Load Custom Libraries
import Misc from 'library/misc';
import DataSet from 'library/dataset';

// Load Constant & Lang
import Constant from 'constant';
import Lang from 'lang';

export default class CandidateBundles extends Component {

    // Default Props
    static defaultProps = {
        data: {},
        onPickup: (data) => {}
    };

    // Initial State
    state = {
        data: null,
        bundleList: []
    };

    /**
     * Handle Functions
     */
    handleBundlePickup = (index) => {
        let bundleList = this.state.bundleList;

        this.props.onPickup(bundleList[index]);
    };

    bundleSearch = () => {
        let data = this.state.data;

        if (null === data) {
            return;
        }

        let skills = data.skills;
        let equips = data.equips;
        let equipsLock = data.equipsLock;

        // Create 1st BundleList & Extra Info
        let requireEquips = [];
        let requireSkills = {};
        let correspondJewels = {};
        let pervBundleList = {};
        let nextBundleList = {};
        let lastBundleList = {};
        let bundle = Misc.deepCopy(Constant.defaultBundle);

        skills.sort((a, b) => {
            return b.level - a.level;
        }).forEach((skill) => {
            requireSkills[skill.name] = skill.level;

            let jewel = DataSet.jewelHelper.hasSkill(skill.name).getItems();
            jewel = (0 !== jewel.length) ? jewel[0] : null;

            correspondJewels[skill.name] = (null !== jewel) ? {
                name: jewel.name,
                size: jewel.size,
            } : null;
        });

        ['weapon', 'helm', 'chest', 'arm', 'waist', 'leg', 'charm'].forEach((equipType) => {
            if (false === equipsLock[equipType]) {
                if ('weapon' !== equipType) {
                    requireEquips.push(equipType);
                }

                return;
            }

            let equipInfo = null;
            let candidateEquip = null;

            if ('weapon' === equipType) {

                // Get Equipment Info
                equipInfo = DataSet.weaponHelper.getApplyedInfo(equips.weapon);

                // Convert Equip to Candidate Equip
                candidateEquip = this.convertEquipToCandidateEquip(equipInfo);

                // Add Candidate Equip to Bundle
                bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

                // Add Jewels info to Bundle
                equipInfo.slots.forEach((slot) => {
                    if (null === slot.jewel) {
                        return;
                    }

                    if (undefined === bundle.jewels[slot.jewel.name]) {
                        bundle.jewels[slot.jewel.name] = 0;
                    }

                    bundle.remainingSlotCount[slot.size] -= 1;
                    bundle.jewels[slot.jewel.name] += 1;
                });
            } else if ('helm' === equipType
                || 'chest' === equipType
                || 'arm' === equipType
                || 'waist' === equipType
                || 'leg' === equipType) {

                // Get Equipment Info
                equipInfo = DataSet.armorHelper.getApplyedInfo(equips[equipType]);

                // Convert Equip to Candidate Equip
                candidateEquip = this.convertEquipToCandidateEquip(equipInfo);

                // Add Candidate Equip to Bundle
                bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

                // Add Jewels info to Bundle
                equipInfo.slots.forEach((slot) => {
                    if (null === slot.jewel) {
                        return;
                    }

                    if (undefined === bundle.jewels[slot.jewel.name]) {
                        bundle.jewels[slot.jewel.name] = 0;
                    }

                    bundle.remainingSlotCount[slot.size] -= 1;
                    bundle.jewels[slot.jewel.name] += 1;
                });
            } else if ('charm' === equipType) {

                // Get Equipment Info
                equipInfo = DataSet.charmHelper.getApplyedInfo(equips.charm);
                equipInfo.type = equipType;

                // Convert Equip to Candidate Equip
                candidateEquip = this.convertEquipToCandidateEquip(equipInfo);

                // Add Candidate Equip to Bundle
                bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);
            }
        });

        // Reset Equip Count & Completed Skill Count
        bundle.euqipCount = 0;
        bundle = this.resetBundleCompeletedSkills(bundle, requireSkills);

        pervBundleList[this.generateBundleHash(bundle)] = bundle;

        let requireEquipsCount = requireEquips.length;
        let requireSkillsCount = Object.keys(requireSkills).length;

        console.log(requireSkills);
        console.log(requireEquips);
        console.log(correspondJewels);
        console.log(pervBundleList);

        // Create Next BundleList with Skill Equips
        console.log('Create Next BundleList with Skill Equips');

        let firstSkillName = Object.keys(requireSkills).shift();
        let lastSkillName = Object.keys(requireSkills).pop();
        let usedSkills = {};

        Object.keys(requireSkills).forEach((skillName, index) => {
            let skillLevel = requireSkills[skillName];

            // Set Past Skills
            usedSkills[skillName] = skillLevel;

            requireEquips.forEach((equipType) => {

                // Get Candidate Equips
                let equips = null;

                if ('helm' === equipType
                    || 'chest' === equipType
                    || 'arm' === equipType
                    || 'waist' === equipType
                    || 'leg' === equipType) {

                    equips = DataSet.armorHelper.typeIs(equipType).hasSkill(skillName).getItems();
                } else if ('charm' === equipType) {
                    equips = DataSet.charmHelper.hasSkill(skillName).getItems();
                }

                let candidateEquips = this.createCandidateEquips(equips, equipType);

                // Add Empty Equip
                if ('charm' === equipType &&
                    skillName === lastSkillName) {

                    // pass
                } else {
                    let candidateEquip = Misc.deepCopy(Constant.defaultCandidateEquip);
                    candidateEquip.type = equipType;

                    candidateEquips.push(candidateEquip);
                }

                if (0 === candidateEquips.length) {
                    return;
                }

                // Create Next BundleList By Skill Equips
                let nextBundleList = {};

                console.log(
                    'CreateNextBundleListBySkillEquips:',
                    Object.keys(pervBundleList).length,
                    equipType,
                    candidateEquips,
                    skillName,
                    skillLevel
                );

                candidateEquips.forEach((candidateEquip) => {
                    Object.keys(pervBundleList).forEach((hash) => {
                        let bundle = Misc.deepCopy(pervBundleList[hash]);

                        if (undefined === bundle.equips[equipType]) {
                            bundle.equips[equipType] = null;
                        }

                        if (undefined === bundle.skills[skillName]) {
                            bundle.skills[skillName] = 0;
                        }

                        // Check Equip & Skill
                        if (null !== bundle.equips[equipType]
                            || skillLevel === bundle.skills[skillName]) {

                            // Add Bundle to Next Run
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            return;
                        }

                        // Add Candidate Equip to Bundle
                        bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

                        if (skillLevel < bundle.skills[skillName]) {

                            // Reset & Add Bundle to Next Run
                            bundle = Misc.deepCopy(pervBundleList[hash]);
                            nextBundleList[this.generateBundleHash(bundle)] = bundle;

                            return;
                        }

                        if (skillLevel > bundle.skills[skillName]) {

                            // Add Jewel to Bundle
                            bundle = this.addJewelToBundleBySpecificSkill(bundle, {
                                name: skillName,
                                level: skillLevel
                            }, correspondJewels[skillName], false);

                            if (skillLevel !== bundle.skills[skillName]
                                && requireEquips === bundle.euqipCount) {

                                // Bundle Has't Next Run

                                return;
                            }
                        }

                        if (skillLevel === bundle.skills[skillName]) {
                            bundle.completedSkillCount += 1;
                        }

                        if (Object.keys(requireSkills).length === bundle.completedSkillCount) {
                            lastBundleList[hash] = bundle;

                            return;
                        }

                        nextBundleList[this.generateBundleHash(bundle)] = bundle;
                    });
                });

                pervBundleList = nextBundleList;
            });
        });

        // Find Compeleted Bundle into Last BundleList
        console.log('Find Compeleted Bundle');

        nextBundleList = {};

        Object.keys(pervBundleList).forEach((hash) => {
            let bundle = Misc.deepCopy(pervBundleList[hash]);

            // Add Jewel to Bundle
            Object.keys(requireSkills).forEach((skillName) => {
                let skillLevel = requireSkills[skillName];

                bundle = this.addJewelToBundleBySpecificSkill(bundle, {
                    name: skillName,
                    level: skillLevel
                }, correspondJewels[skillName], true);
            });

            // Reset Compeleted Skills of Bundle
            bundle = this.resetBundleCompeletedSkills(bundle, requireSkills);

            if (Object.keys(usedSkills).length === bundle.completedSkillCount) {
                lastBundleList[hash] = bundle;
            } else {
                nextBundleList[hash] = bundle;
            }
        });

        pervBundleList = Misc.deepCopy(nextBundleList);

        console.log(
            'Last BundleList:', Object.keys(lastBundleList).length,
            'Next BundleList:', Object.keys(nextBundleList).length
        );

        // Create Next BundleList with Slot Equips
        // if (0 === Object.keys(lastBundleList).length) {
        //     requireEquips.forEach((equipType) => {
        //         if ('charm' === equipType) {
        //             return;
        //         }

        //         // Get Candidate Equips
        //         let equips = DataSet.armorHelper.typeIs(equipType).rareIs(0).getItems();
        //         let candidateEquips = this.createCandidateEquips(equips, equipType);

        //         if (0 === candidateEquips.length) {
        //             return;
        //         }

        //         // Create Next BundleList By Slot Equips
        //         let nextBundleList = {};

        //         console.log(
        //             'CreateNextBundleListBySlotEquips:',
        //             Object.keys(pervBundleList).length,
        //             equipType,
        //             candidateEquips
        //         );

        //         candidateEquips.forEach((candidateEquip) => {
        //             Object.keys(pervBundleList).forEach((hash) => {
        //                 let bundle = Misc.deepCopy(pervBundleList[hash]);

        //                 if (undefined === bundle.equips[equipType]) {
        //                     bundle.equips[equipType] = null;
        //                 }

        //                 if (null !== bundle.equips[equipType]) {
        //                     nextBundleList[this.generateBundleHash(bundle)] = bundle;

        //                     return;
        //                 }

        //                 // Add Candidate Equip to Bundle
        //                 bundle = this.addCandidateEquipToBundle(bundle, candidateEquip);

        //                 nextBundleList[this.generateBundleHash(bundle)] = bundle;
        //             });
        //         });

        //         pervBundleList = nextBundleList;
        //     });

        //     // Find Compeleted Bundle into Last BundleList
        //     console.log('Find Compeleted Bundle');

        //     Object.keys(pervBundleList).forEach((hash) => {
        //         let bundle = Misc.deepCopy(pervBundleList[hash]);

        //         // Add Jewel to Bundle
        //         Object.keys(requireSkills).forEach((skillName) => {
        //             let skillLevel = requireSkills[skillName];

        //             bundle = this.addJewelToBundleBySpecificSkill(bundle, {
        //                 name: skillName,
        //                 level: skillLevel
        //             }, correspondJewels[skillName], true);
        //         });

        //         // Reset Compeleted Skills of Bundle
        //         bundle = this.resetBundleCompeletedSkills(bundle, requireSkills);

        //         if (Object.keys(usedSkills).length === bundle.completedSkillCount) {
        //             lastBundleList[hash] = bundle;
        //         }
        //     });
        // }

        // console.log('Last BundleList:', Object.keys(lastBundleList).length);

        lastBundleList = Object.values(lastBundleList).sort((a, b) => {
            let valueA = (8 - a.euqipCount) * 1000 + a.defense;
            let valueB = (8 - b.euqipCount) * 1000 + b.defense;

            return valueB - valueA;
        }).slice(0, 25);

        console.log(lastBundleList);

        this.setState({
            bundleList: lastBundleList
        });
    };

    generateBundleHash = (bundle) => {
        let equips = {};
        let jewels = {};

        Object.keys(bundle.equips).forEach((equipType) => {
            if (null === bundle.equips[equipType]) {
                return;
            }

            equips[equipType] = bundle.equips[equipType];
        });

        Object.keys(bundle.jewels).sort().forEach((jewelName) => {
            if (0 === bundle.jewels[jewelName]) {
                return;
            }

            jewels[jewelName] = bundle.jewels[jewelName];
        });

        return MD5(JSON.stringify([equips, jewels]));
    };

    createCandidateEquips = (equips, equipType) => {
        let candidateEquips = [];

        equips.forEach((equip) => {
            equip.type = equipType;

            // Convert Equip to Candidate Equip
            let candidateEquip = this.convertEquipToCandidateEquip(equip);

            candidateEquips.push(candidateEquip);
        });

        return candidateEquips;
    };

    convertEquipToCandidateEquip = (equip) => {
        let candidateEquip = Misc.deepCopy(Constant.defaultCandidateEquip);

        // Set Name, Type & Defense
        candidateEquip.name = equip.name;
        candidateEquip.type = equip.type;
        candidateEquip.defense = (undefined !== equip.defense) ? equip.defense : 0;

        // Set Skills
        if (undefined === equip.skills) {
            equip.skills = [];
        }

        equip.skills.forEach((skill) => {
            candidateEquip.skills[skill.name] = skill.level;
        });

        // Set Slots
        if (undefined === equip.slots) {
            equip.slots = [];
        }

        equip.slots.forEach((slot) => {
            candidateEquip.ownSlotCount[slot.size] += 1;
        });

        return candidateEquip;
    };

    addCandidateEquipToBundle = (bundle, candidateEquip) => {
        if (null === candidateEquip.name) {
            return bundle;
        }

        if (undefined !== bundle.equips[candidateEquip.type]
            && null !== bundle.equips[candidateEquip.type]) {

            return bundle;
        }

        bundle.equips[candidateEquip.type] = candidateEquip.name;
        bundle.defense += candidateEquip.defense;

        Object.keys(candidateEquip.skills).forEach((skillName) => {
            let skillLevel = candidateEquip.skills[skillName];

            if (undefined === bundle.skills[skillName]) {
                bundle.skills[skillName] = 0;
            }

            bundle.skills[skillName] += skillLevel;
        });

        for (let size = 1; size <= 3; size++) {
            bundle.remainingSlotCount[size] += candidateEquip.ownSlotCount[size];
        }

        bundle.euqipCount += 1;

        return bundle;
    };

    addJewelToBundleBySpecificSkill = (bundle, skill, jewel, isAllowLargerSlot = false) => {
        let diffSkillLevel = skill.level - bundle.skills[skill.name];

        if (0 === diffSkillLevel) {
            return bundle;
        }

        // Get Jewel
        if (null === jewel.name && 0 !== diffSkillLevel) {
            // console.log('Failed - No Jewel', skill.name);

            return false;
        }

        let currentSlotSize = jewel.size;
        let usedSlotCount = {
            1: 0,
            2: 0,
            3: 0
        };

        while (true) {
            if (false === isAllowLargerSlot) {
                if (0 === bundle.remainingSlotCount[currentSlotSize]) {
                    return false;
                }

                if (diffSkillLevel > bundle.remainingSlotCount[currentSlotSize]) {
                    // console.log('Failed - No Slots', skill.name);

                    return false;
                }

                break;
            } else {
                if (0 !== bundle.remainingSlotCount[currentSlotSize]) {
                    if (diffSkillLevel > bundle.remainingSlotCount[currentSlotSize]) {
                        usedSlotCount[currentSlotSize] = bundle.remainingSlotCount[currentSlotSize];
                        diffSkillLevel -= bundle.remainingSlotCount[currentSlotSize];
                    } else {
                        usedSlotCount[currentSlotSize] = diffSkillLevel;
                        diffSkillLevel = 0;
                    }
                }

                currentSlotSize += 1;

                if (0 === diffSkillLevel) {
                    break;
                }

                if (3 < currentSlotSize) {
                    // console.log('Failed - No Slots', skill.name);

                    return false;
                }
            }
        }

        if (undefined === bundle.skills[skill.name]) {
            bundle.skills[skill.name] = 0;
        }

        if (undefined === bundle.jewels[jewel.name]) {
            bundle.jewels[jewel.name] = 0;
        }

        diffSkillLevel = skill.level - bundle.skills[skill.name];

        bundle.skills[skill.name] += diffSkillLevel;
        bundle.jewels[jewel.name] += diffSkillLevel;

        Object.keys(usedSlotCount).forEach((slotSize) => {
            bundle.remainingSlotCount[slotSize] -= usedSlotCount[slotSize];
        });

        return bundle;
    };

    resetBundleCompeletedSkills = (bundle, skills) => {
        bundle.completedSkillCount = 0;

        Object.keys(skills).forEach((skillName, index) => {
            let skillLevel = skills[skillName];

            if (undefined === bundle.skills[skillName]) {
                bundle.skills[skillName] = 0;
            }

            if (skillLevel === bundle.skills[skillName]) {
                bundle.completedSkillCount += 1;
            }
        });

        return bundle;
    };

    /**
     * Lifecycle Functions
     */
    componentDidMount () {
        Event.on('SearchCandidateEquips', 'CandidateBundles', (data) => {
            this.setState({
                data: data
            }, () => {
                this.bundleSearch();
            });
        });
    }

    /**
     * Render Functions
     */
    renderBundleItems = () => {
        let bundleList = this.state.bundleList;

        return bundleList.map((data, index) => {
            return (
                <div key={index} className="row mhwc-item">
                    <div className="col-12 mhwc-name">
                        <span>備選 {index + 1}</span>

                        <div className="mhwc-icons_bundle">
                            <a className="mhwc-icon" onClick={() => {this.handleBundlePickup(index)}}>
                                <i className="fa fa-check"></i>
                            </a>
                        </div>
                    </div>
                    <div className="col-12 mhwc-value">
                        <div className="row">
                            <div className="col-4 mhwc-name">
                                <span>裝備</span>
                            </div>
                            <div className="col-8 mhwc-value">
                                <span>{
                                    Object.values(data.equips).filter((equipName) => {
                                        return (null !== equipName);
                                    }).map((equipName) => {
                                        return equipName;
                                    }).join(', ')
                                }</span>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-4 mhwc-name">
                                <span>裝飾珠</span>
                            </div>
                            <div className="col-8 mhwc-value">
                                <span>{
                                    Object.keys(data.jewels).map((jewelName) => {
                                        let jewelCount = data.jewels[jewelName];

                                        return `${jewelName} x ${jewelCount}`;
                                    }).join(', ')
                                }</span>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-4 mhwc-name">
                                <span>防禦力</span>
                            </div>
                            <div className="col-8 mhwc-value">
                                <span>{data.defense}</span>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-4 mhwc-name">
                                <span>技能</span>
                            </div>
                            <div className="col-8 mhwc-value">
                                <span>{
                                    Object.keys(data.skills).map((skillName) => {
                                        let skillCount = data.skills[skillName];

                                        return `${skillName} Lv.${skillCount}`;
                                    }).join(', ')
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    render () {
        return (
            <div className="mhwc-candidate_bundles">
                {this.renderBundleItems()}
            </div>
        );
    }
}
