// Hoodie Moin Task worker.
// pickes up new moin tasks, collects data
// and writes it into todays moin object.

var moment = require('moment');
var async = require('async');
var github = require('octonode');

module.exports = function(hoodie, doneCallback) {
  hoodie.task.on('add:mointask', handleNewMoinTask);

  function handleNewMoinTask(dbName, moinTask) {
    console.log('new moin task!', moinTask);

    var onSuccess = function(reposWithIssues){
      reposWithIssues.forEach(function(repoWithIssues) {
        var repoName = repoWithIssues.repo;
        var issues = repoWithIssues.issues;

        console.log('%s:\n%s issues closed since %s', repoName, issues.length, moinTask.since);
      });

      hoodie.task.success(dbName, moinTask);
    }
    var onError = function(error) {
      console.log(error);
      hoodie.task.error(dbName, moinTask, error);
    };

    run(moinTask, function(error, reposWithIssues) {
      if (error) {
        return onError(error);
      }

      var db = hoodie.database(dbName);
      var day = moment(moinTask.since).startOf('day').format('YYYYMMDD');
      var obj = {reposWithIssues: reposWithIssues};

      db.update('moin', day, obj, function(error) {

        if(error && error.error === 'not_found') {
          obj.id = day;
          return db.add('moin', obj, function(error) {
            if (error) {
              return onError(error);
            }

            onSuccess(reposWithIssues);
          });
        }

        if (error) {
          return onError(error);
        }

        onSuccess(reposWithIssues);
      });
    });

  }

  doneCallback();
};

function run(config, workerCallback) {

  var since = moment(config.since).startOf('day').format();
  var client = github.client(config.auth);
  var hoodieOrg = client.org('hoodiehq');
  hoodieOrg.repos( {
    page: 1,
    per_page: 100
  }, function(error, result) {
    if (error) {
      return console.log(error);
    }

    console.log('%s repositories loaded\n', result.length);

    var getRecentlyClosedIssues = function(repo, callback) {
      repo = client.repo(repo.full_name);

      console.log('loading issues from %s ...', repo.name);
      repo.issues({
        per_page: 100,
        state: 'closed',
        since: since
      }, function(error, issues) {
        if (error) {
          return callback( null, {
            repo: repo,
            error: error
          });
        }

        callback( null, {
          repo: repo,
          issues: issues
        });
      });
    };
    async.map(result, getRecentlyClosedIssues, handleAllRecentlyClosedIssues);
  });

  function parseUser (user) {
    if (! user) {
      return user;
    }
    return {
      login: user.login,
      gravatar_id: user.gravatar_id,
      site_admin: user.site_admin
    };
  }

  function parseLabels (labels) {
    return labels.map( function(label) {
      return label.name;
    });
  }
  function parseIssue (issue) {
    // { url: 'https://api.github.com/repos/hoodiehq/hoodie.js/issues/221',
    //   labels_url: 'https://api.github.com/repos/hoodiehq/hoodie.js/issues/221/labels{/name}',
    //   comments_url: 'https://api.github.com/repos/hoodiehq/hoodie.js/issues/221/comments',
    //   events_url: 'https://api.github.com/repos/hoodiehq/hoodie.js/issues/221/events',
    //   html_url: 'https://github.com/hoodiehq/hoodie.js/pull/221',
    //   id: 25943785,
    //   number: 221,
    //   title: 'hoodie.task.add doesn\'t trigger start event',
    //   user:
    //    { login: 'gr2m',
    //      id: 39992,
    //      avatar_url: 'https://gravatar.com/avatar/24fc194843a71f10949be18d5a692682?d=https%3A%2F%2Fidenticons.github.com%2Fffacbb7db90628bfcc8be667616dfcc7.png&r=x',
    //      gravatar_id: '24fc194843a71f10949be18d5a692682',
    //      url: 'https://api.github.com/users/gr2m',
    //      html_url: 'https://github.com/gr2m',
    //      followers_url: 'https://api.github.com/users/gr2m/followers',
    //      following_url: 'https://api.github.com/users/gr2m/following{/other_user}',
    //      gists_url: 'https://api.github.com/users/gr2m/gists{/gist_id}',
    //      starred_url: 'https://api.github.com/users/gr2m/starred{/owner}{/repo}',
    //      subscriptions_url: 'https://api.github.com/users/gr2m/subscriptions',
    //      organizations_url: 'https://api.github.com/users/gr2m/orgs',
    //      repos_url: 'https://api.github.com/users/gr2m/repos',
    //      events_url: 'https://api.github.com/users/gr2m/events{/privacy}',
    //      received_events_url: 'https://api.github.com/users/gr2m/received_events',
    //      type: 'User',
    //      site_admin: false },
    //   labels:
    //    [ { url: 'https://api.github.com/repos/hoodiehq/hoodie.js/labels/bug',
    //        name: 'bug',
    //        color: 'fc2929' } ],
    //   state: 'closed',
    //   assignee: null,
    //   milestone: null,
    //   comments: 0,
    //   created_at: '2014-01-20T20:19:24Z',
    //   updated_at: '2014-01-20T20:20:38Z',
    //   closed_at: '2014-01-20T20:20:38Z',
    //   pull_request:
    //    { html_url: 'https://github.com/hoodiehq/hoodie.js/pull/221',
    //      diff_url: 'https://github.com/hoodiehq/hoodie.js/pull/221.diff',
    //      patch_url: 'https://github.com/hoodiehq/hoodie.js/pull/221.patch' },
    //   body: '' }

    return {
      id: issue.id,
      url: issue.url.replace('https://api.github.com/repos/', ''),
      number: issue.number,
      title: issue.title,
      user: parseUser(issue.user),
      labels: parseLabels(issue.labels),
      assignee: parseUser(issue.assignee),
      created_at: '2014-01-20T20:19:24Z',
      updated_at: '2014-01-20T20:20:38Z',
      closed_at: '2014-01-20T20:20:38Z',
      body: ''
    };
  }

  function handleAllRecentlyClosedIssues(error, reposWithIssues) {
    if (error) {
      return console.log(error);
    }

    var closedIssues = [];
    reposWithIssues.forEach(function(repoWithIssues) {
      var repo = repoWithIssues.repo;
      var issues = repoWithIssues.issues;
      var error = repoWithIssues.error;
      if (error) {
        return console.log('%s occured for %s. Ignoring…', error, repo.name);
      }

      if (issues.length === 0) {
        return; // ignoring
      }

      closedIssues.push({
        repo: repo.name,
        issues: issues.map(parseIssue)
      });
    });

    workerCallback(null, closedIssues);
  }
}
