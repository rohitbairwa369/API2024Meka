const jwt = require('jsonwebtoken');
const secretKey = "SuperSecret"
 
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
 
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
 
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ auth:false, message: 'Failed to authenticate token' });
    }
 
    // If the token is valid, you can access the decoded information in subsequent routes
    req.decoded = decoded;
    next();
  });
};
 
module.exports = verifyToken;