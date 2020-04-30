const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
exports.main = async (event, context) => {
  const { roomId } = event;
  const { data } = await db.collection('rooms').doc(roomId).get();
  const { roleSettings } = data;
  const { totalRoles } = roleSettings;

  const roleAssignment = assignRoles(totalRoles);
  const {
    nextActionRole,
    totalNextActionRoleCount,
    inGraveyardNextRoles
  } = getNextActionRole(null, totalRoles, roleAssignment);

  return db.collection('rooms').doc(roomId).update({
    data: {
      game: {
        roleAssignment,
        status: 'gaming',
        currentRole: nextActionRole,
        currentRoleCount: totalNextActionRoleCount, // 当前在场上的该角色人数（除去墓地里的）
        currentRoleActionedCount: 0, // 该角色已经行动的人数
        inGraveyardNextRoles,
      },
    },
  });
}

function assignRoles(totalRoles) {
  var allRoles = [];
  for (const role in totalRoles) {
    const roleCount = totalRoles[role];
    for (var i = 0; i < roleCount; i++) {
      allRoles.push(role);
    }
  }
  allRoles = shuffle(allRoles);

  var graveyardRoles = [];
  var playerRoles = [];
  for (var i = 0; i < allRoles.length; i++) {
    const roleObj = {
      init: allRoles[i],
      current: allRoles[i],
    };
    if (i < 3) {
      graveyardRoles.push(roleObj);
    } else {
      playerRoles.push(roleObj);
    }
  }

  return { graveyardRoles, playerRoles };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getNextActionRole(currentRole, totalRoles, roleAssignment) {
  const ACTION_ORDER = [
    "wereWolf",
    "mysticWolf",
    "minion",
    "mason",
    "seer",
    "apprenticeSeer",
    "robber",
    "witch",
    "troublemaker",
    "drunk",
    "insomniac",
    "revealer"
  ];
  const { graveyardRoles, playerRoles } = roleAssignment; 
  const initGraveyardRoles = graveyardRoles.map(role => role.init);
  const initPlayerRoles = playerRoles.map(role => role.init);

  const currIdx = currentRole ? ACTION_ORDER.findIndex(x => x === currentRole) : -1;

  var nextActionRole = null;
  var totalNextActionRoleCount = 0;
  var inGraveyardNextRoles = [];

  for (var i = currIdx + 1; i < ACTION_ORDER.length; i++) {
    const role = ACTION_ORDER[i];
    if (totalRoles[role] > 0) {
      if (initGraveyardRoles.includes(role) && !initPlayerRoles.includes(role)) {
        inGraveyardNextRoles.push({
          role,
          pendingTime: generateRandomActionTime(5000, 15000)
        });
        continue;
      } else {
        nextActionRole = role;
        totalNextActionRoleCount = initPlayerRoles.filter(x => x === role).length;
        break;
      }
    }
  }

  return {
    nextActionRole,
    totalNextActionRoleCount,
    inGraveyardNextRoles
  };
}

function generateRandomActionTime(min, max) {  
  return Math.floor(Math.random() * (max - min) + min); 
}