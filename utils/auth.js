import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dBClient from './db';
import redisClient from './redis';

export function getBasicAuthToken(request) {
  const header = request.headers.authorization;
  if (!header) { return null; }
  const token = header.split(' ')[1];
  if (!token) { return null; }
  const tok = Buffer.from(token, 'base64').toString('utf-8');
  const [email, password] = tok.split(':');
  return { email, password };
}

export function getSessionToken(request) {
  const header = request.headers['x-token'];
  if (!header) { return null; }
  return header;
}

export async function authenticateUser(email, password) {
  const user = await dBClient.findUserByEmail(email);
  if (!user) { return null; }
  const pass = sha1(password);
  if (user.password !== pass) { return null; }
  return user;
}

export async function generateSessionToken(userId) {
  const token = uuidv4();
  const key = `auth_${token}`;
  await redisClient.set(key, userId, 24 * 60 * 60);
  return { token };
}

export async function deleteSessionToken(token) {
  const uId = await redisClient.get(`auth_${token}`);
  if (!uId) { return false; }
  await redisClient.del(`auth_${token}`);
  return true;
}

export async function getUserFromSession(token) {
  const uId = await redisClient.get(`auth_${token}`);
  if (!uId) { return null; }
  const user = await dBClient.findUserById(uId);
  if (!user) { return null; }
  return { email: user.email, id: user._id };
}

export async function getCurrentUser(request) {
  const token = getSessionToken(request);
  if (!token) { return null; }
  const user = await getUserFromSession(token);
  if (!user) { return null; }
  return user;
}
