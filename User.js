import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    trim: true 
  },
  phone: { 
    type: String, 
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'learner', 'educator'], 
    default: 'user' 
  },
  status: { 
    type: String, 
    enum: ['active', 'blocked', 'pending'], 
    default: 'active' 
  },
  provider: { 
    type: String, 
    default: 'email' 
  },
  lastLoginAt: { 
    type: Date 
  },
  loginCount: {
    type: Number,
    default: 0
  },
  otpCode: { 
    type: String 
  },
  otpExpiresAt: { 
    type: Date 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  // Device tracking for multi-device support
  devices: [{
    deviceId: {
      type: String,
      required: true,
      unique: false
    },
    deviceName: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    ipAddress: String,
    lastLoginAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    loginCount: {
      type: Number,
      default: 1
    }
  }],
  // Session tracking
  activeSessions: [{
    sessionId: String,
    deviceId: String,
    token: String,
    createdAt: Date,
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  // Profile sync timestamp across devices
  lastProfileUpdateAt: Date,
  syncedDevices: [String],
  preferredDevice: String
}, { 
  timestamps: true 
});

// Indexes
userSchema.index({ status: 1 });
userSchema.index({ createdAt: 1 });

// Methods
userSchema.methods.recordLogin = async function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.lastProfileUpdateAt = new Date();
  return await this.save();
};

// Record device login and sync credentials
userSchema.methods.recordDeviceLogin = async function(deviceInfo) {
  const { deviceId, deviceName, deviceType, os, browser, ipAddress } = deviceInfo;
  
  // Find if device already exists
  const existingDeviceIndex = this.devices.findIndex(d => d.deviceId === deviceId);
  
  if (existingDeviceIndex >= 0) {
    // Update existing device
    this.devices[existingDeviceIndex].lastLoginAt = new Date();
    this.devices[existingDeviceIndex].loginCount += 1;
    this.devices[existingDeviceIndex].isActive = true;
    this.devices[existingDeviceIndex].ipAddress = ipAddress;
    this.devices[existingDeviceIndex].browser = browser;
    this.devices[existingDeviceIndex].os = os;
  } else {
    // Add new device
    this.devices.push({
      deviceId,
      deviceName,
      deviceType,
      os,
      browser,
      ipAddress,
      lastLoginAt: new Date(),
      isActive: true,
      loginCount: 1
    });
  }
  
  // Mark device as synced
  if (!this.syncedDevices.includes(deviceId)) {
    this.syncedDevices.push(deviceId);
  }
  
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  this.lastProfileUpdateAt = new Date();
  return await this.save();
};

// Update credentials across all devices
userSchema.methods.updateCredentialsAcrossDevices = async function(updates) {
  // Update user data
  Object.assign(this, updates);
  
  // Mark profile updated
  this.lastProfileUpdateAt = new Date();
  
  // Mark all active devices as needing sync
  this.devices.forEach(device => {
    if (device.isActive) {
      device.lastLoginAt = new Date();
    }
  });
  
  return await this.save();
};

// Get active devices
userSchema.methods.getActiveDevices = function() {
  return this.devices.filter(d => d.isActive);
};

// Sync data to all devices
userSchema.methods.syncToAllDevices = async function() {
  const activeDevices = this.getActiveDevices();
  return {
    user: this.toSafeObject(),
    devices: activeDevices,
    syncedAt: new Date()
  };
};

userSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    phone: this.phone,
    role: this.role,
    status: this.status,
    lastLoginAt: this.lastLoginAt,
    loginCount: this.loginCount,
    devices: this.getActiveDevices(),
    lastProfileUpdateAt: this.lastProfileUpdateAt,
    createdAt: this.createdAt
  };
};

// Statics
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

export default mongoose.model('User', userSchema);
