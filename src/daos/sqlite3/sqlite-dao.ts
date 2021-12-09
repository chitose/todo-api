import { Sequelize } from 'sequelize';

const db = new Sequelize({
    dialect: 'sqlite',
    storage: `./todo.${process.env.NODE_ENV as string}.sqlite`
});

export default db;