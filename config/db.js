const mongoose = require('mongoose');
const dns = require('dns');

// Configure reliable DNS servers to ensure MongoDB Atlas SRV records resolve properly on Windows environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Fall back to system default resolvers if custom setting is restricted
}

// Utility to safely URL-encode special characters in MongoDB URI credentials
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return uri;

  const protoMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)/i);
  if (!protoMatch) return uri;
  const protocol = protoMatch[1];
  const withoutProto = uri.slice(protocol.length);

  // Locate the last '@' separating credentials from host
  const lastAt = withoutProto.lastIndexOf('@');
  if (lastAt === -1) return uri; // No user:password credentials in URI

  const userinfo = withoutProto.slice(0, lastAt);
  let hostAndRest = withoutProto.slice(lastAt + 1);

  // Split username and password on the FIRST colon
  const firstColon = userinfo.indexOf(':');
  if (firstColon === -1) return uri;

  const username = userinfo.slice(0, firstColon);
  const password = userinfo.slice(firstColon + 1);

  // Encode credentials safely, preventing double-encoding
  const safeEncode = (val) => {
    try {
      return encodeURIComponent(decodeURIComponent(val));
    } catch {
      return encodeURIComponent(val);
    }
  };

  const encodedUser = safeEncode(username);
  const encodedPass = safeEncode(password);

  // Ensure database name 'jobportal' is set if path is empty or root
  const slashIdx = hostAndRest.indexOf('/');
  if (slashIdx === -1) {
    hostAndRest += '/jobportal?retryWrites=true&w=majority';
  } else {
    const afterSlash = hostAndRest.slice(slashIdx + 1);
    if (!afterSlash || afterSlash.startsWith('?')) {
      hostAndRest =
        hostAndRest.slice(0, slashIdx + 1) +
        'jobportal' +
        (afterSlash.startsWith('?') ? afterSlash : '?retryWrites=true&w=majority');
    }
  }

  return `${protocol}${encodedUser}:${encodedPass}@${hostAndRest}`;
}

// Utility to mask password in MongoDB URI for safe logging
function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const idxAt = uri.lastIndexOf('@');
  const idxColon = uri.indexOf(':', uri.indexOf('://') + 3);
  if (idxColon !== -1 && idxAt !== -1 && idxColon < idxAt) {
    return uri.slice(0, idxColon + 1) + '*****' + uri.slice(idxAt);
  }
  return uri;
}

const connectDB = async () => {
  const rawUri = process.env.MONGODB_URI;

  if (!rawUri || rawUri.includes('127.0.0.1') || rawUri.includes('localhost')) {
    console.log('\n------------------------------------------------------------');
    console.log('ℹ️  MongoDB Configuration Notice:');
    console.log('   MONGODB_URI is currently pointing to local MongoDB.');
    console.log('   If you are using MongoDB Atlas, update your .env file with:');
    console.log('   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/jobportal?retryWrites=true&w=majority');
    console.log('------------------------------------------------------------\n');
  }

  const connUri = sanitizeMongoUri(rawUri || 'mongodb://127.0.0.1:27017/jobportal');
  const maskedUri = maskMongoUri(connUri);

  try {
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 8000, // 8s timeout for cloud connections
    });

    console.log(` MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`);
    console.log(` Target URI: ${maskedUri}`);
    return conn;
  } catch (error) {
    console.error(` MongoDB Connection Error: ${error.message}`);
    console.error(` Attempted to connect to: ${maskedUri}`);
    console.error('\n🛠️  Atlas Troubleshooting Checklist:');
    console.error('1. Atlas Network Access: Set IP Access List to 0.0.0.0/0 (Allow from Anywhere).');
    console.error('2. Database User: Verify the username & password under Atlas Database Access.');
    console.error('3. User Privileges: Ensure user has "Read and write to any database" role.');
    console.error('4. Special Characters in Password: Automatic URL-encoding is active in config/db.js.\n');

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const isDbConnected = () => mongoose.connection.readyState === 1;

connectDB.connectDB = connectDB;
connectDB.isDbConnected = isDbConnected;
connectDB.sanitizeMongoUri = sanitizeMongoUri;
connectDB.maskMongoUri = maskMongoUri;

module.exports = connectDB;
