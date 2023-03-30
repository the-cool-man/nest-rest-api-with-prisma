import { ForbiddenException, Injectable } from "@nestjs/common";
import { User, Bookmark } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { AuthDto } from "./dto";
import * as argon from "argon2";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {

    constructor(private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService) { }

    async login(dto: AuthDto) {

        // find the user by email
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email,
            }
        })

        // if user does not exist throw exception
        if (!user) {
            throw new ForbiddenException("Credentials are incorrect");
        }

        // compare password
        const pwMatches = await argon.verify(user.hash, dto.password);

        if (!pwMatches) {
            throw new ForbiddenException("Credentials are incorrect");
        }

        // send back to user
        return this.signToken(user.id, user.email);
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

            // return to user
            return {
                status: 'Register success',
                data: this.signToken(user.id, user.email)
            };

        } catch (error) {
            //  console.log(error);

            if (error.code === 'P2002') {
                throw new ForbiddenException('Email is already taken');

            } else {
                throw error;
            }

        }
    }

    async signToken(userId: number, email: string): Promise<{ access_token: string }> {

        const payload = {
            sub: userId,
            email
        };

        const token = await this.jwt.signAsync(payload, {
            expiresIn: '15m',
            secret: this.config.get("JWT_SECRET")
        });

        return {
            access_token: token,
        };

    }




}