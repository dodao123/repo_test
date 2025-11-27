import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('ok');
});

app.get('/hello', (req: Request, res: Response) => {
    res.send('hello world');
});

// Placeholder for protected route
// app.get('/protected', (req: Request, res: Response) => {
//   // TODO: Implement token verification
//   res.send('protected content');
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
