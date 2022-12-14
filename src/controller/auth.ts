import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Request, Response } from "express";
import { AppDataSource } from "../config/db";
import { User } from "../entity/User";
import { RegisterValidation } from "../validation/registerValidation";
import jwt from "jsonwebtoken";

dotenv.config({ path: './.env' });

export const Register = async (req: Request, res: Response) => {
    const body = req.body;

    const { error } = RegisterValidation.validate(body);
    
    if(error){
        return res.status(400).send(error.details);
    }
    
    //Validate Confirm Password
    if(body.password !== body.password_confirm){
        return res.status(400).send({
            message: 'Password do not match'
        });
    }

    const repository = AppDataSource.getRepository(User);

    const email = await repository.findOneBy({ email: req.body.email});

    //Check if user is registered
    if(email){
        res.status(401).send({
            message: "User is registered"
        }) 
    }else{
        const { password, ...user } = await repository.save({
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            password: await bcrypt.hash(body.password, 0)
        })
    
        res.send(user); 
    }
    
}

export const Login = async (req: Request, res: Response) => {
    const repository = AppDataSource.getRepository(User);

    const user = await repository.findOneBy({ email: req.body.email});

    //Validate email and password
    if(!user || !await bcrypt.compare(req.body.password, user.password)){
        return res.status(401).send({
            message: "Invalid Credentials"
        });
    }

    const payload = {
        user: {
            id: user.id
        }
    }

    jwt.sign(
        payload, 
        process.env.SECRET_KEY,
        {expiresIn: '5 days'},
        (err, token) => {
            if(err) throw err
            res.json({ token });
        }
    );
}

export const AuthenticatedUser = async (req: Request | any, res: Response) => {
    try {

        const repository = AppDataSource.getRepository(User);

        const {password, ...user} = await repository.findOne({
            where:{
                id: req.user.id
            }
        });
        

        res.json(user);
        
    } catch (error) {
        return res.status(401).send({
            message: "Unauthenticated"
        });
    }
}

export const Logout = async (req:Request, res: Response) => {
    res.cookie("jwt", "logout", {
        maxAge: 0,
        httpOnly: true
    });

    res.send({
        message: "Success"
    });
}