const MongoClient = require('mongodb').MongoClient
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const express = require('express')
const app = express()

require('dotenv').config()

app.use(express.json())


const URL = process.env.DB_URL
const SECRET = process.env.SECRET
const SALT = bcrypt.genSaltSync(10)


let db, collection
MongoClient.connect(URL, (err, client)=> {
    if(err) {
        return console.log(err)
    }

    db = client.db('pkmn')
    collection = db.collection('users')

    console.log('DB connected')
})



app.get('/users/list', (req, res)=> {
    collection
        .find({})  // Busca todos los usuarios en la coleccion
        .toArray() // Y los ordena como un array
        .then((result)=> { 
            res.json({ success: true, result }) // Envia una respuesta exitosa y el resultado obtenido desde DB
        })
        .catch((error)=> {
            res.json({ success: false, error }) // Envia una respuesta negativa indicando el error
        })
})

app.get('/users/:user', (req, res)=> {
    const user = req.params.user
    collection
        .findOne({ user })
        .then((result)=> {
            res.json({ success: true, result })
        })
        .catch((error)=> {
            res.json({ success: false, error })
        })
})



app.post('/users/register', (req, res)=> {
    /* 
        user: String
        password: String
    */
    const data = req.body

    if(!data.user) {
        return res.json({ success: false, msg: 'Usuario requerido' })
    }

    if(!data.password) {
        return res.json({ success: false, msg: 'Contraseña requerida' })
    }

    // Encriptar contraseña
    data.password = bcrypt.hashSync(data.password, SALT)

    // Guardar en base de datos
    collection
        .insertOne(data)
        .then((result)=> {
            res.json({ success: true, result })
        })
        .catch((error)=> {
            res.json({ success: false, error })
        })
})


app.put('/users/update/:user', (req, res)=> {
    collection
        .findOneAndUpdate(
            { user: req.params.user },  // Primero se hace la query de busqueda
            { $set: req.body },         // Actualizacion
            { upsert: true }            // Opciones - Upsert -> Si no existe, lo crea
        )
        .then((result)=> {
            res.json({ success: true, result })
        })
        .catch((error)=> {
            res.json({ success: false, error })
        })
})


app.delete('/users/delete/:user', (req, res)=> {
    collection
        .deleteOne({ user: req.params.user })
        .then((result)=> {
            res.json({ success: true, result })
        })
        .catch((error)=> {
            res.json({ success: false, error })
        })
})


app.post('/login', (req, res)=> {
    const user = req.body.user
    const pass = req.body.password

    if(!user) {
        return res.json({ success: false, msg: 'Usuario requerido' })
    }

    if(!pass) {
        return res.json({ success: false, msg: 'Contraseña requerida' })
    }

    collection
        .findOne({ user })
        .then((result)=> {
            let validPass = bcrypt.compareSync(pass, result.password) // Devuelve boolean

            if(validPass) {
                const token = jwt.sign({ user }, SECRET, { expiresIn: '3h' })
                res.json({ success: true, token })
            } else {
                res.json({ success: false, msg: 'Contraseña incorrecta' })
            }
        })
        .catch((error)=> {
            res.json({ success: false, msg: 'Usuario no registrado' })
        })
})


const PORT = process.env.PORT || 8000
app.listen(PORT, ()=> { console.log(`Server running on port ${PORT}`) })