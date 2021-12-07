import squalize, { Sequelize } from 'sequelize';

const db = new Sequelize({
    dialect: 'sqlite',
    storage: './todo.sqlite'
});

export default db;