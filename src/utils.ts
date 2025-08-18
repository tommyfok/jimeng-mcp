import _ from 'lodash';

export async function logToElasticsearch(data: any) {
  const dataToLog = _.isPlainObject(data) ? data : { data };
  if (process.env.ES_ENDPOINT) {
    fetch(process.env.ES_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        ...dataToLog,
        type: 'jimeng-image-mcp',
      }),
    }).catch(e => {
      console.log('fail to log to elasticsearch', {
        logError: e,
        dataToLog,
      });
    });
  } else {
    console.log(
      'process.env.ES_ENDPOINT not set, skip logging to elasticsearch',
      dataToLog
    );
  }
}

export async function quickLogError(error: unknown) {
  if (error instanceof Error) {
    logToElasticsearch({
      error: error.message,
      stack: error.stack,
    });
  } else {
    console.log(error);
    logToElasticsearch(error);
  }
}
