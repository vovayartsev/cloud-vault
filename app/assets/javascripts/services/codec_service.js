angular.module('vault').service('CodecService', function ($q, $http, KeyManagerService, TriplesecService) {
  this.encrypt = function (projection) {
    return $q.when(_.clone(projection))
      .then(encryptContent)
      .then(encryptPassphrase)
      .then(signTeam)
      .then(parameterizeAndSanitize);
  };

  this.decrypt = function (projection) {
    return $q.when(projection)
      .then(decryptPassphrase)
      .then(decryptContent);
  };

  /* PRIVATE */

  function encryptContent(proj) {
    return TriplesecService.genpw().
      then(function (pw) {
        proj.passphrase = pw;
        return TriplesecService.encrypt(proj.decryptedContent, pw);
      }).then(function (encrypted) {
        proj.encryptedContent = encrypted;
        return proj;
      });
  }

  function decryptContent(proj) {

  }

  function decryptPassphrase(proj) {

  }

  function encryptPassphrase(proj) {
    proj.passphrases = [];
    var promises = _.map(proj.team, function (member) {
      return fetchPublicKeyFor(member.kbLogin)
        .then(function (memberKey) {
          return KeyManagerService.pgpEncryptForKey(proj.passphrase, memberKey)
        })
        .then(function (encryptedPassphrase) {
          proj.passphrases.push({kb_login: member.kbLogin, phrase: encryptedPassphrase});
        });
    });
    return $q.all(promises).then(function () {
      proj.passphrase = null; // security measure
      return proj;
    })
  }

  function signTeam(proj) {
    var teamStr = proj.team.map(function (x) {
      return x.kbLogin
    }).join("\n");

    return KeyManagerService.pgpSign(teamStr).then(function (signedMsg) {
      proj.signedTeam = signedMsg;
      return proj;
    })
  }

  function parameterizeAndSanitize(proj) {
    return proj.toParams();
  }

  function fetchPublicKeyFor(kbLogin) {
    return $q(function (resolve, reject) {
      $.get("https://keybase.io/" + kbLogin + "/key.asc", resolve)
    })
  }
});
