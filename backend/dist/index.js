"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.status(200).send('ok');
});
app.get('/hello', (req, res) => {
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
