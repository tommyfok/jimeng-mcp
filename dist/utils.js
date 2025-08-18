import _ from 'lodash';
export async function logToElasticsearch(data) {
    const dataToLog = _.isPlainObject(data) ? data : JSON.stringify({ data });
    console.log('Not implemented: logToElasticsearch', dataToLog);
}
export async function quickLogError(error) {
    if (error instanceof Error) {
        logToElasticsearch({
            error: error.message,
            stack: error.stack,
        });
    }
    else {
        console.log(error);
        logToElasticsearch(error);
    }
}
//# sourceMappingURL=utils.js.map