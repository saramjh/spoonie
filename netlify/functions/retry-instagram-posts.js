// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _drainInstagramQueue } = require('./release-queued-recipes');

exports.handler = async () => {
  try {
    const instagram = await _drainInstagramQueue(Date.now(), 2);
    console.log('instagram retry', JSON.stringify(instagram));
    return { statusCode: 200, body: JSON.stringify({ instagram }) };
  } catch (error) {
    console.error('instagram retry failed', error);
    return { statusCode: 500, body: String(error) };
  }
};
