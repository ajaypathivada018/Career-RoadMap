/**
 * Device Detection Utility
 * Extracts device information from request headers
 */
import crypto from 'crypto';

function getDeviceInfo(req) {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Detect device type
  let deviceType = 'unknown';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    deviceType = 'mobile';
  } else if (/ipad|android(?!.*mobi)|tablet|kindle/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/windows|mac|linux/i.test(userAgent)) {
    deviceType = 'desktop';
  }
  
  // Detect OS
  let os = 'unknown';
  if (/windows nt/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|macos|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/linux/i.test(userAgent)) os = 'Linux';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent)) os = 'iOS';
  
  // Detect browser
  let browser = 'unknown';
  if (/edg/i.test(userAgent)) browser = 'Edge';
  else if (/chrome|chromium|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/opera|opr/i.test(userAgent)) browser = 'Opera';
  
  // Generate device ID based on user agent and IP (consistent across same device)
  const deviceFingerprint = `${userAgent}-${ipAddress}`;
  const deviceId = crypto.createHash('sha256').update(deviceFingerprint).digest('hex').substring(0, 16);
  
  // Device name
  const deviceName = `${os} - ${browser}`;
  
  return {
    deviceId,
    deviceName,
    deviceType,
    os,
    browser,
    ipAddress,
    userAgent
  };
}

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

export { getDeviceInfo, generateSessionId };