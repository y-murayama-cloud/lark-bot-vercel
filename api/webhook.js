if (body.type === 'url_verification' && body.challenge) {
  return res.status(200).json({ challenge: body.challenge });
}
