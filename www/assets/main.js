// initialize Hoodie
var hoodie  = new Hoodie()
var $history = $('#history');
var moinStore = hoodie.store('moin');

$(document.body).on('click', '.task.btn', function(event) {
  var since = moment().subtract('days', 1).startOf('day').format('YYYY-MM-DD');
  hoodie.moinTasks.start({
    since: since,
    organizationName: 'hoodiehq',
    sendEmail: true
  });
  $history.html('<tr><td>loading ...</td></tr>');
});

function renderTable (moinObjects) {
  var json;
  var moinObject;
  var html = '';
  var content;
  var issues;
  var issue;

  for (var i = 0; i < moinObjects.length; i++) {
    moinObject = moinObjects[i]

    content = moinObject.results.map(function(moin) {
      return moin.text;
    }).join('\n\n');

    html += '<tr><th>'+moinObject.id+'</th><td><pre>'+content+'</pre></td>';
  };

  $history.html(html);
}

function renderHistory () {
  moinStore.findAll().then(renderTable);
}
moinStore.on('change', renderHistory);
renderHistory();
