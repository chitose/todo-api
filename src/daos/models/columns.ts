import { DataTypes, Model, ModelAttributeColumnOptions } from 'sequelize';


export function autoIncrementIdColumn<T extends Model<any, any>>(): ModelAttributeColumnOptions<T> {
    return {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    };
}