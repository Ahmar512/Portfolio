import path from "path";
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

dotenv.config();
const PORT = process.env.PORT || 3000;
bodyParser.urlencoded({extended:true});
const app = express();
const contactEmail = nodemailer.createTransport({
    service: "gmail",
    secure:true,
    port: 465,
    auth:{
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASS
    }
});
contactEmail.verify((err)=>{
    if(err){
        console.log(err.message);
    }else{
        console.log("ready to send");
    }
})

app.get("/api", (req, res)=>{
    res.json({ massage: "Hello from sever!"})
});
app.post("/api/contact", bodyParser.urlencoded({extended: true}), (req, res)=>{
    const name = req.body.name;
    const email = req.body.email;
    const subject = req.body.subject;
    const message = req.body.message;
    const mail = {
        from: name,
        to: process.env.EMAIL_ADDRESS,
        subject: "Contact from submission - Portfolio",
        html: `<p>Name: ${name}</p>
        <p>Email: ${email}</p>
        <p>Subject: ${subject}</p>
        <p>message: ${message}</p>
        `
    }
    contactEmail.sendMail(mail, (err)=>{
        if(err){
            res.json(error);
        }else{
            res.json({code:200, status:"Message Send"});
        }
    })
});

app.listen(PORT, ()=>{
    console.log(`Server is online on ${PORT}`);
})