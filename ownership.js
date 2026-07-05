import mongoose from 'mongoose';

/**
 * Build a filter that matches documents owned by the authenticated user.
 */
export function ownerFilter(user) {
  const id = user.id.toString();
  const clauses = [{ user: user.id }, { userId: id }];
  if (user.email) clauses.push({ userEmail: user.email });
  return { $or: clauses };
}

export function documentOwnedByUser(doc, user) {
  if (!doc || !user) return false;
  const id = user.id.toString();
  if (doc.user && doc.user.toString() === id) return true;
  if (doc.userId && doc.userId.toString() === id) return true;
  if (user.email && doc.userEmail === user.email) return true;
  return false;
}

export function parseOwnerQuery(req) {
  if (req.user) {
    return ownerFilter(req.user);
  }
  const { userId, userEmail } = req.query;
  if (userId) {
    if (mongoose.Types.ObjectId.isValid(userId) && userId !== 'guest') {
      return { $or: [{ user: userId }, { userId }] };
    }
    return { userId };
  }
  if (userEmail) return { userEmail };
  return null;
}
