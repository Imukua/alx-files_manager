import dbClient from '../utils/db';
import { userQueue } from '../worker';

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    const exists = await dbClient.findUserByEmail(email);
    if (exists) {
      return response.status(400).json({ error: 'Already exist' });
    }

    const newUser = await dbClient.addUser(email, password);
    userQueue.add({ userId: newUser.id });
    return response.status(201).json(newUser);
  }
}

export default UsersController;
