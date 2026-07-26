import { verifyToken } from '../config/jwt.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    console.log('protect: No token found in headers or cookies');
    return next(new ApiError(401, 'Not authorized. Please log in.'));
  }

  try {
    const decoded = verifyToken(token);
    console.log('protect: Token decoded successfully', { id: decoded.id, role: decoded.role });
    
    const user = await User.findById(decoded.id);
    console.log('protect: User lookup result', { found: !!user, isActive: user?.isActive });

    if (!user || !user.isActive) {
      console.log('protect: User not found or inactive', { found: !!user, isActive: user?.isActive });
      return next(new ApiError(401, 'User no longer exists or is deactivated.'));
    }

    req.user = user;
    next();
  } catch (error) {
    console.log('protect: Token verification failed', error);
    return next(new ApiError(401, 'Invalid or expired token.'));
  }
};

export const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

export default { protect, restrictTo };
