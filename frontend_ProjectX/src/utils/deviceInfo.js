/**
 * Generates a pseudo-unique device fingerprint based on browser
 * characteristics and persists it in localStorage across sessions.
 */
export const getDeviceId = () => {
  let deviceId = localStorage.getItem('projectx_device_id');
  if (!deviceId) {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    deviceId = `dev_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
    localStorage.setItem('projectx_device_id', deviceId);
  }
  return deviceId;
};

export const getDeviceBrand = () => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser}-${os}`;
};
