require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model("Admin", adminSchema);

async function run() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing.");
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required.");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const username = process.env.ADMIN_USERNAME.trim();
  const password = process.env.ADMIN_PASSWORD;

  const existing = await Admin.findOne({ username });

  if (existing) {
    existing.password = await bcrypt.hash(password, 12);
    await existing.save();
    console.log(`Admin '${username}' password updated.`);
  } else {
    await Admin.create({
      username,
      password: await bcrypt.hash(password, 12)
    });
    console.log(`Admin '${username}' created.`);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
