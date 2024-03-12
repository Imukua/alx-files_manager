import { existsSync, promises } from 'fs';
import { ObjectId } from 'mongodb';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import dBClient from './db';

export const FOLDER = 'folder';
const FILE = 'file';
const MAX_PAGE_SIZE = 20;
const IMAGE = 'image';
const VALID_FILE_TYPES = [FOLDER, FILE, IMAGE];
const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

const { mkdir, writeFile } = promises;

export class FilesCollection {
  constructor() {
    this.files = dBClient.filesCollection();
  }

  async findById(id) {
    return this.files.findOne({ _id: ObjectId(id) });
  }

  async addFile(file) {
    const res = await this.files.insertOne(file);
    const { _id, ...rest } = res.ops[0];
    return { id: _id, ...rest };
  }

  async findUserFileById(userId, fileId, removeLocalPath = true) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const res = await this.files.findOne({
      userId: ObjectId(userId),
      _id: ObjectId(fileId),
    });
    if (!res) { return null; }
    if (removeLocalPath) {
      return FilesCollection.removeLocalPath(
        FilesCollection.replaceDefaultMongoId(res),
      );
    }
    return FilesCollection.replaceDefaultMongoId(res);
  }

  async findPublicOrOwnFile(userId, fileId) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }

    const res = await this.files.findOne({
      _id: ObjectId(fileId),
    });
    if (!res) { return null; }

    if (!res.isPublic && (!userId || !res.userId.equals(userId))) {
      return null;
    }

    if (res.type !== FOLDER && !existsSync(res.localPath)) {
      return null;
    }

    return FilesCollection.replaceDefaultMongoId(res);
  }

  async findAllUserFilesByParentId(userId, parentId, page) {
    let query = { userId: ObjectId(userId) };

    if (parentId !== 0) {
      if (!ObjectId.isValid(parentId)) {
        return [];
      }
      const parent = await this.findById(parentId);
      if (!parent || parent.type !== FOLDER) {
        return [];
      }
      query = {
        ...query,
        parentId: ObjectId(parentId),
      };
    }
    const res = await this.files
      .find(query)
      .skip(page * MAX_PAGE_SIZE)
      .limit(MAX_PAGE_SIZE)
      .toArray();
    return res.map(
      FilesCollection.replaceDefaultMongoId,
    ).map(FilesCollection.removeLocalPath);
  }

  async updateFilePublication(userId, fileId, isPublished) {
    if (!ObjectId.isValid(fileId)) {
      return null;
    }
    const res = await this.files.updateOne(
      {
        _id: ObjectId(fileId),
        userId: ObjectId(userId),
      },
      { $set: { isPublic: isPublished } },
    );
    if (res.matchedCount !== 1) {
      return null;
    }
    const doc = await this.findById(fileId);
    return FilesCollection.removeLocalPath(
      FilesCollection.replaceDefaultMongoId(doc),
    );
  }

  static replaceDefaultMongoId(document) {
    const { _id, ...rest } = document;
    return { id: _id, ...rest };
  }

  static removeLocalPath(document) {
    const doc = { ...document };
    delete doc.localPath;
    return doc;
  }
}

export default class File {
  constructor(userId, name, type, parentId, isPublic, data) {
    this.userId = userId;
    this.name = name;
    this.type = type;
    this.parentId = parentId || 0;
    this.isPublic = isPublic || false;
    this.data = data;
    this.filesCollection = new FilesCollection();
  }

  async validate() {
    if (!this.name) {
      return 'Missing name';
    }

    if (!this.type || !VALID_FILE_TYPES.includes(this.type)) {
      return 'Missing type';
    }

    if (!this.data && this.type !== FOLDER) {
      return 'Missing data';
    }

    if (this.parentId) {
      const parent = await this.filesCollection.findById(this.parentId);
      if (!parent) {
        return 'Parent not found';
      }

      if (parent.type !== FOLDER) {
        return 'Parent is not a folder';
      }
    }

    return null;
  }

  async save() {
    const error = await this.validate();
    if (error) {
      throw new Error(error);
    }

    if (this.type === FOLDER) {
      return this.filesCollection.addFile({
        userId: ObjectId(this.userId),
        name: this.name,
        type: FOLDER,
        parentId: this.parentId,
      });
    }
    await mkdir(FOLDER_PATH, { recursive: true });
    const localPath = join(FOLDER_PATH, uuidv4());
    await writeFile(localPath, Buffer.from(this.data, 'base64'));
    return this.filesCollection.addFile({
      userId: ObjectId(this.userId),
      name: this.name,
      type: this.type,
      isPublic: this.isPublic,
      parentId: this.parentId ? ObjectId(this.parentId) : 0,
      localPath,
    });
  }
}
