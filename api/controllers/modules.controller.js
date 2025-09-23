import Module from "../models/modules.model.js";
import Examiner from "../models/examiner.model.js";

export const addModule = async (req, res) => {
  try {
    const { module_name, department, lecturer_in_charge } = req.body;
    if (!module_name || !department || !lecturer_in_charge) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the examiner by examiner_id
    const lecturer = await Examiner.findOne({ examiner_id: lecturer_in_charge });
    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }

    // Generate module_code
    const lastModule = await Module.findOne({ department }).sort({ module_code: -1 });
    let nextNumber = 1;
    if (lastModule) {
      const lastNum = parseInt(lastModule.module_code.slice(-3), 10);
      nextNumber = lastNum + 1;
    }
    const module_code = `M${department.toUpperCase()}${String(nextNumber).padStart(3, "0")}`;

    // Create & save
    const newModule = new Module({
      module_code,
      module_name,
      department,
      lecturer_in_charge: lecturer._id,
    });
    const saved = await newModule.save();

    // Populate before sending back
    const populated = await saved.populate('lecturer_in_charge', 'examiner_id name');
    res.status(201).json({ message: "Module added successfully", module: populated });
  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 2) Get all modules (already populates)
export const viewAllModules = async (req, res) => {
  try {
    const modules = await Module
      .find()
      .populate('lecturer_in_charge', 'examiner_id name');
    res.status(200).json(modules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 3) Get one module by ID
export const viewModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await Module
      .findById(id)
      .populate('lecturer_in_charge', 'examiner_id name');
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.status(200).json(module);
  } catch (error) {
    console.error("Error fetching module by ID:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 4) Update Module (you could also populate here if you need)
export const updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { module_name, department, lecturer_in_charge } = req.body;
    const updateData = { module_name, department };

    if (lecturer_in_charge) {
      const lecturer = await Examiner.findOne({ examiner_id: lecturer_in_charge });
      if (!lecturer) {
        return res.status(404).json({ message: "Lecturer not found" });
      }
      updateData.lecturer_in_charge = lecturer._id;
    }

    const updated = await Module
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('lecturer_in_charge', 'examiner_id name');

    if (!updated) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.status(200).json({ message: "Module updated successfully", module: updated });
  } catch (error) {
    console.error("Error updating module:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 5) Delete Module
export const deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Module.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ message: "Server error", error });
  }
};