"use strict";

require('../libs.js');

// statuses seem as follow
// 1 - not accepted
// 2 - accepted
// 3 - failed 
// 4 - completed

function acceptQuest(tmpList, body) {
    tmpList.data[0].Quests.push({
		"qid": body.qid.toString(), 
		"startTime": utility.getTimestamp(), 
		"status": 2
	}); 
	
    profile.setCharacterData(tmpList);

    item.resetOutput();
    return item.getOutput();

}

function completeQuest(tmpList, body) {
    for (let quest in tmpList.data[0].Quests) {
        if (tmpList.data[0].Quests[quest].qid === body.qid) {
            if (tmpList.data[0].Quests[quest].restartable === false) {
                // quest completed
                tmpList.data[0].Quests[quest].status = 4;
            } else {
                // remove quest to allow it to be restartable again
                for (let counter in tmpList.data[0].BackendCounters) {
                    if (tmpList.data[0].BackendCounters[counter].qid === tmpList.data[0].Quests[quest].qid) {
                        delete tmpList.data[0].BackendCounters[counter];
                    }
                }

                tmpList.data[0].Quests.splice(quest, 1);
            }

            profile.setCharacterData(tmpList);
            break;
        }
    }

    // find Quest data and update trader loyalty
    for (let quest of quests.data) {
        if (quest._id !== body.qid) {
            continue;
        }

        for (let reward of quest.rewards.Success) {
            switch (reward.type) {
                case "Item":
                    for (let rewardItem of reward.items) {
                        let newReq = {};

                        newReq.item_id = rewardItem._tpl;
                        newReq.count = parseInt(reward.value);
                        newReq.tid = "ragfair";
                
                        tmpList = profile.getCharacterData();
                        move_f.addItem(tmpList, newReq);
                    }
                    break;

                case "Experience":
                    tmpList = profile.getCharacterData();
                    tmpList.data[0].Info.Experience += parseInt(reward.value);
                    profile.setCharacterData(tmpList);
                    break;

                case "TraderStanding":
                    // improve trader standing
                    let tmpTraderInfo = trader.get(quest.traderId);

                    tmpTraderInfo.data.loyalty.currentStanding
                    tmpTraderInfo.data.loyalty.currentStanding = tmpTraderInfo.data.loyalty.currentStanding + parseFloat(reward.value);
                    trader.setTrader(tmpTraderInfo.data);

                    // level up trader
                    trader.lvlUp(quest.traderId);
                    break;
            }
        }
    }

    item.resetOutput();
    let output = item.getOutput();
    output.data.quests = quests.data;
    return output;
}

// TODO: handle money
function handoverQuest(tmpList, body) {
    item.resetOutput();
    
    let output = item.getOutput();
    let counter = 0;
    let found = false;
    
    for (let itemHandover of body.items) {
        counter += itemHandover.count;
        output = move_f.removeItem(tmpList, itemHandover.id, output);
    }

    for (let backendCounter in tmpList.data[0].BackendCounters) {
        if (backendCounter === body.conditionId) {
            tmpList.data[0].BackendCounters[body.conditionId].value += counter;
            found = true;
        }
    }

    if (!found) {
        tmpList.data[0].BackendCounters[body.conditionId] = {"id": body.conditionId, "qid": body.qid, "value": counter};
    }

    profile.setCharacterData(tmpList);
    return output;
}

module.exports.acceptQuest = acceptQuest;
module.exports.completeQuest = completeQuest;
module.exports.handoverQuest = handoverQuest;