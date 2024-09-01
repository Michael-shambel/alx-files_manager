import dbClient from '../utils/db';
import crypto from 'crypto';


export async function postNew(req, res) {
    const { email, password } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Missing email' });
    }
    
    if (!password) {
        return res.status(400).json({ error: 'Missing password' });
    }
    
    const checkEmailExist = await dbClient.db.collection('users').findOne({ email });
    
    if (checkEmailExist) {
        return res.status(400).json({ error: 'Already exist' });
    }
    
    const hashPassword = crypto.createHash('sha1').update(password).digest('hex');

    const user = await dbClient.db.collection('users').insertOne({ email, password: hashPassword });

    res.status(201).json({ id: user.insertedId, email });
}