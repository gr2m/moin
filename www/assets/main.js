// initialize Hoodie
var hoodie  = new Hoodie()
var $tasks = $('#tasks');
var $history = $('#history');
var moinStore = hoodie.store('moin');
hoodie.moinTasks.available.forEach(function(moinTask) {
  $tasks.append('<button class="task btn">'+moinTask+'</button>')
});

$(document.body).on('click', '.task.btn', function() {
  var token = hoodie.config.get('github-token');
  if (! token) {
    token = prompt('Github token');

    if (! token) {
      return alert('sorry, github token required');
    }

    hoodie.config.set('github-token', token);
  }

  hoodie.moinTasks.start({
    since: new Date(),
    auth: token
  });
  $history.html('<tr><td>loading ...</td></tr>');
});

function renderTable (moinObjects) {
  var json;
  var moinObject;
  var html = '';
  var content;
  var repoWithIssues;
  var issue;

  for (var i = 0; i < moinObjects.length; i++) {
    moinObject = moinObjects[i]

    content = '<dl>';
    for (var j = 0; j < moinObject.reposWithIssues.length; j++) {
      repoWithIssues = moinObject.reposWithIssues[j];
      content += '<dt>'
      content += repoWithIssues.repo
      content += '</dt>'

      for (var k = 0; k < repoWithIssues.issues.length; k++) {
        issue = repoWithIssues.issues[k]
        content += '<dd>'
        content += issue.title
        content += ' (<a href="https://github.com/'+issue.url+'">#'+issue.number+'</a>)';
        content += '</dd>'
      };
    };

    content += '</dl>'
    html += '<tr><th>'+moinObject.id+'</th><td>'+content+'</td>';
  };

  $history.html(html);
}

function renderHistory () {
  moinStore.findAll().then(renderTable);
}
moinStore.on('change', renderHistory);
renderHistory();
