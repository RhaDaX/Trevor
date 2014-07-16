Rails.application.config.middleware.use OmniAuth::Builder do
  provider :fitbit, 'a99a1cee773548c6b90fe2eb7d11825c', '1631e5b33d1b4a89b1045e79326444fe'
end