import { type IUserRepository } from "@/prisma";
import { type User, Prisma } from "@prisma/client";

export class UserService {
    constructor(
        private readonly userRepository: IUserRepository
    ) {}

    public async isExistUser(uid: string): Promise<boolean> {
        const user = await this.userRepository.findUnique({
            where: {id: uid}
        });
        return user !== null;
    }

    public getUserById(uid: string): Promise<User | null> {
        return this.userRepository.findUnique({ where: {
                id: uid
            }});
    }

    public createUser(data: Prisma.UserCreateInput): Promise<User> {
        return this.userRepository.create({ data });
    }

    public updateUser(uid: string, data: Prisma.UserUpdateInput): Promise<User> {
        return this.userRepository.update({ where: { id: uid }, data });
    }
}
