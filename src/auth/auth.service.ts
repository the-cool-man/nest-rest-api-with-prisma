import { ForbiddenException, Injectable } from "@nestjs/common";
import { User, Bookmark } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";

@Injectable()
export class AuthService {

    constructor(private prisma: PrismaService) {}

    async login(dto: AuthDto) {

    // find the user by email
    const user = await this.prisma.user.findUnique({
        where: {
            email: dto.email,
        }
    })

    // if user does not exist throw exception
    if(!user) {
        throw new ForbiddenException("Credentials are incorrect");
    }

    // compare password
    const pwmatches =  await argon.verify(user.hash, dto.password);
    if(!pwmatches) {
        throw new ForbiddenException("Credentials are incorrect");
    }

    // send back to user
    delete user.hash;
    return user;
    }


    async signup(dto: AuthDto) {
        // generate a password
        const hash = await argon.hash(dto?.password);

        try {
            // save the new user in db
            const user = await this.prisma.user.create({
                data: {
                    email: dto?.email,
                    hash,
                }
            })

            delete user.hash;
            
            // return to user
            return {
                status: 'Register success',
                data: user
            };
            
        } catch (error) {
          //  console.log(error);

            if(error.code === 'P2002') {
                throw new ForbiddenException('Email is already taken');

            } else {
                throw error;
            }

        }
    }


    // async verifyPassword() {
    //     try {
    //         if (await argon.verify("<big long hash>", "password")) {
    //           // password match
    //         } else {
    //           // password did not match
    //         }
    //     } catch (err) {
    //     // internal failure
    //     }
    // }
}