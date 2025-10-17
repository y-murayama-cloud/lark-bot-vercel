// api/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const body = req.body || {};

  // LarkのURL検証イベントへ応答（challengeを返す）
  if (body.type === 'url_verification' && body.challenge) {
    return res.status(200).json({ challenge: body.challenge });
  }

  // 本処理（メッセージ受信など）はあとで追加します
  return res.status(200).send('ok');
}
