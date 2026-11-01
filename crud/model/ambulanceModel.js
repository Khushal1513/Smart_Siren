import mongoose from 'mongoose';



const ambulanceSchema = new mongoose.Schema({

  identifier: {

    type: String,

    required: true,

    unique: true,

  },

  active: {

    type: Boolean,

    default: false,

  },

  location: {

    type: String,

    default: '',

  },

  updatedAt: {

    type: Date,

    default: Date.now,

  },

});



const ambulanceModel = mongoose.model('ambulance', ambulanceSchema);



export default ambulanceModel;