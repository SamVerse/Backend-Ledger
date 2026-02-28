const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


const userSchema = new mongoose.Schema({
     email: {
        type: String,
        required: [true, "Email is required for creating a user"],
        trim: true,
        lowercase: true,
        unique: [true, "Email already exists"],
        match: [
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            'Please fill a valid email address.'  
        ] 
     },
     name: {
        type: String,
        required: [true, "Name is required for creating an account"],
     },
     password: {
        type: String,
        required: [true, "Password is required for creating an account"],
        minlength: [6, "Password must be at least 6 characters long"],
        // We don't want to return password field on any GET request by default
        select: false
     },
     systemUser: {
         type: Boolean,
         default: false,
         immutable: true,  // This field cannot be changed once set, ensuring that a user cannot be converted to or from a system user after creation.
         select: false  // We also don't want to return systemUser field on any GET request by default, as it's an internal detail that clients don't need to know about.
     }
}, {
    timestamps: true
});

userSchema.pre("save", async function(){
     if(!this.isModified("password")){
        return;
     }

     try {
        // Here we using 10 rounds for generating salt, which is a good balance between security and performance.
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return;

     } catch (error) {
        throw new Error("Error in hashing password");
     }
})

userSchema.methods.comparePassword = async function(candidatePassword){
    return await bcrypt.compare(candidatePassword, this.password);
}

const User = mongoose.model("user", userSchema);

module.exports = User;