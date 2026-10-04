// eslint-disable-next-line @typescript-eslint/no-require-imports
const { _call: call, _ig: ig, _instagramToken: instagramToken } = require('./release-queued-recipes');

const CHECKPOINTS = [24, 72];
const WINDOW_MS = 6 * 60 * 60 * 1000;
const METRICS = ['reach', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];

function checkpointState(publishedAt, status24, status72, now = new Date()) {
  const publishedMs = new Date(publishedAt).getTime();
  const nowMs = now.getTime();
  if (!Number.isFinite(publishedMs) || nowMs < publishedMs) return { capture: [], miss: [] };

  const statuses = { 24: status24, 72: status72 };
  const capture = [];
  const miss = [];

  for (const hours of CHECKPOINTS) {
    if (statuses[hours] !== 'pending') continue;
    const dueMs = publishedMs + hours * 60 * 60 * 1000;
    if (nowMs < dueMs) continue;
    if (nowMs <= dueMs + WINDOW_MS) capture.push(hours);
    else miss.push(hours);
  }

  return { capture, miss };
}

function metricValues(data) {
  const values = Object.fromEntries(METRICS.map((name) => [name, 0]));
  for (const metric of data || []) {
    if (!(metric.name in values)) continue;
    const raw = metric.values?.[0]?.value ?? metric.total_value?.value ?? 0;
    values[metric.name] = Number(raw) || 0;
  }
  return values;
}

async function mediaMetadata(mediaId, token) {
  return ig('GET', `/${mediaId}`, {
    fields: 'id,media_type,permalink,timestamp',
    access_token: token,
  });
}

async function mediaInsights(mediaId, token) {
  const response = await ig('GET', `/${mediaId}/insights`, {
    metric: METRICS.join(','),
    access_token: token,
  });
  return metricValues(response.data);
}

async function collectInstagramInsights(now = new Date()) {
  const token = await instagramToken();
  if (!token) return { skipped: 'no token', captured: 0, missed: 0 };

  const rows = await call(
    'GET',
    'release_queue?select=item_id,instagram_media_id,instagram_published_at,instagram_insights_24h_status,instagram_insights_72h_status' +
      '&instagram_media_id=not.is.null' +
      '&or=(instagram_insights_24h_status.eq.pending,instagram_insights_72h_status.eq.pending)' +
      '&order=release_order.asc&limit=50'
  );

  if (!rows.length) return { captured: 0, missed: 0, results: [] };

  const account = await ig('GET', '/me', { fields: 'followers_count', access_token: token });
  let captured = 0;
  let missed = 0;
  const results = [];

  for (const row of rows) {
    let publishedAt = row.instagram_published_at;
    let metadata = null;

    if (!publishedAt) {
      metadata = await mediaMetadata(row.instagram_media_id, token);
      publishedAt = new Date(metadata.timestamp).toISOString();
      await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
        instagram_published_at: publishedAt,
      });
    }

    const state = checkpointState(
      publishedAt,
      row.instagram_insights_24h_status,
      row.instagram_insights_72h_status,
      now
    );

    for (const hours of state.miss) {
      await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
        [`instagram_insights_${hours}h_status`]: 'missed',
      });
      missed += 1;
      results.push({ itemId: row.item_id, checkpointHours: hours, status: 'missed' });
    }

    if (!state.capture.length) continue;

    if (!metadata) metadata = await mediaMetadata(row.instagram_media_id, token);
    const metrics = await mediaInsights(row.instagram_media_id, token);
    const ageMinutes = Math.max(0, Math.round((now.getTime() - new Date(publishedAt).getTime()) / 60000));

    for (const hours of state.capture) {
      await call(
        'POST',
        'instagram_media_insights?on_conflict=instagram_media_id,checkpoint_hours',
        {
          item_id: row.item_id,
          instagram_media_id: row.instagram_media_id,
          checkpoint_hours: hours,
          published_at: publishedAt,
          observed_at: now.toISOString(),
          observed_age_minutes: ageMinutes,
          media_type: metadata.media_type || null,
          permalink: metadata.permalink || null,
          account_followers: Number(account.followers_count) || null,
          ...metrics,
        },
        { Prefer: 'resolution=merge-duplicates,return=representation' }
      );
      await call('PATCH', `release_queue?item_id=eq.${row.item_id}`, {
        [`instagram_insights_${hours}h_status`]: 'captured',
      });
      captured += 1;
      results.push({ itemId: row.item_id, checkpointHours: hours, status: 'captured', ageMinutes });
    }
  }

  return { captured, missed, results };
}

exports.handler = async () => {
  try {
    const result = await collectInstagramInsights(new Date());
    console.log('instagram insights', JSON.stringify(result));
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('instagram insights failed', error);
    return { statusCode: 500, body: String(error) };
  }
};

exports._checkpointState = checkpointState;
exports._metricValues = metricValues;
exports._collectInstagramInsights = collectInstagramInsights;
