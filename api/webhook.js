// api/webhook.js
import crypto from 'crypto';
import fetch from 'node-fetch';

function verifySignature(body, signature, encryptKey) {
  const hash = crypto.createHmac('sha256', encryptKey)
                     .update(JSON.stringify(body))
                     .digest('hex');
  return hash === signature;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body || {};
  const signature = req.headers['x-lark-signature'];
  const encryptKey = process.env.ENCRYPT_KEY;

  // URL検証イベント
  if (body.type === 'url_verification' && body.challenge) {
  return res.status(200).json({ challenge: body.challenge });
  }


  // 署名検証（Encrypt Keyが設定されている場合のみ）
  if (encryptKey && !verifySignature(body, signature, encryptKey)) {
    console.warn('Invalid signature');
    return res.status(403).send('Invalid signature');
  }

  // メッセージ受信イベント
  if (body.header?.event_type === 'im.message.receive_v2') {
    try {
      const {
        LARK_APP_ID,
        LARK_APP_SECRET,
        BITABLE_APP_TOKEN,
        BITABLE_TABLE_ID
      } = process.env;

      // アクセストークン取得
      const tokenRes = await fetch('https://open.larkoffice.com/open-apis/auth/v3/app_access_token/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: LARK_APP_ID, app_secret: LARK_APP_SECRET }),
      });
      const { app_access_token } = await tokenRes.json();

      // メールグループ取得
      const mailRes = await fetch('https://open.larkoffice.com/open-apis/mail/v1/mailgroups', {
        headers: { Authorization: `Bearer ${app_access_token}` },
      });
      const { data } = await mailRes.json();

      // Baseに書き込み
      for (const group of data.mailgroups || []) {
        await fetch(`https://open.larkoffice.com/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${app_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              mailgroup_id: group.mailgroup_id,
              address: group.address,
              name: group.name,
              description: group.description,
              who_can_send_mail: group.who_can_send_mail,
            },
          }),
        });
      }

      return res.status(200).send('Mailgroups synced to Base');
    } catch (error) {
      console.error('Error syncing mailgroups:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(200).send('ok');
}
