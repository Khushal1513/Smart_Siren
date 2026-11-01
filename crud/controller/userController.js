import User from "../model/usermodel.js";

export const create=async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = new User(req.body);
   const {email} =user;

   const userExist=await User.findOne({email});
    if(userExist){
      return res.status(400).json({ message: "User already exists" });
    }
    const savedUser = await user.save();
    res.status(200).json(savedUser);   

  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const fetch = async (req, res) => {
  try {
    const users = await User.find();
    if(users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }
    res.status(200).json(users);
  }
  catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export const update = async (req, res) => {
  try {
    const id=req.params.id;
    const userExist=await User.findOne({_id:id});
    if(!userExist){
      return res.status(404).json({ message: "User not found" });
    }
    const updatedUser = await User.findByIdAndUpdate(id, req.body , { new: true });
    res.status(200).json(updatedUser);
}catch (error) {
    res.status(500).json({ error: "Internal server error" });
  } 
};

export const deleteUser = async (req, res) => {
  try {
    const id=req.params.id;
    const userExist=await User.findById({_id : id});
    if(!userExist){
      return res.status(404).json({ message: "User not found" });
    }
    await User.findByIdAndDelete(id);
    res.status(201).json({ message: "User deleted successfully" });
  }catch (error) {    
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getVehicleCount = async (req, res) => {
  try {
    const count = await Vehicle.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch vehicle count', error: error.message });
  }
};
