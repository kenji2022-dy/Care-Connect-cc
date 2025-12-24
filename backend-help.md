# CareConnect Backend Architecture & Database Design

## 🏗️ **Technology Stack**

### **Backend Framework**

- **Node.js** with **Express.js** - Fast, scalable server-side JavaScript
- **TypeScript** - Type safety and better development experience
- **Socket.io** - Real-time communication for emergency alerts and chat


### **Database**

- **MongoDB** with **Mongoose** - Document-based NoSQL for flexible healthcare data
- **Redis** - Caching and session management
- **GridFS** - Large file storage (medical images, documents)


### **Authentication & Security**

- **JWT** - JSON Web Tokens for stateless authentication
- **bcrypt** - Password hashing
- **helmet** - Security headers
- **rate-limiter** - API rate limiting


### **External Services**

- **Twilio** - SMS/Voice for emergency notifications
- **AWS S3** - File storage for EHR documents
- **Google Maps API** - Location services
- **OpenAI API** - AI-powered medical suggestions
- **Stripe** - Payment processing


### **DevOps & Monitoring**

- **Docker** - Containerization
- **PM2** - Process management
- **Winston** - Logging
- **Prometheus** - Metrics
- **Jest** - Testing


---

## 📁 **Backend File Structure**

```plaintext
careconnect-backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── jwt.ts
│   │   ├── twilio.ts
│   │   ├── aws.ts
│   │   └── openai.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Patient.ts
│   │   ├── Doctor.ts
│   │   ├── Hospital.ts
│   │   ├── Appointment.ts
│   │   ├── MedicalRecord.ts
│   │   ├── Prescription.ts
│   │   ├── Emergency.ts
│   │   ├── Chat.ts
│   │   └── Notification.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── patient.controller.ts
│   │   ├── doctor.controller.ts
│   │   ├── hospital.controller.ts
│   │   ├── appointment.controller.ts
│   │   ├── medical-record.controller.ts
│   │   ├── prescription.controller.ts
│   │   ├── emergency.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── ai.controller.ts
│   │   └── notification.controller.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── patient.routes.ts
│   │   ├── doctor.routes.ts
│   │   ├── hospital.routes.ts
│   │   ├── appointment.routes.ts
│   │   ├── medical-record.routes.ts
│   │   ├── prescription.routes.ts
│   │   ├── emergency.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── ai.routes.ts
│   │   └── notification.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── upload.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── email.service.ts
│   │   ├── sms.service.ts
│   │   ├── file.service.ts
│   │   ├── ai.service.ts
│   │   ├── location.service.ts
│   │   └── notification.service.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── patient.types.ts
│   │   ├── doctor.types.ts
│   │   └── common.types.ts
│   ├── sockets/
│   │   ├── emergency.socket.ts
│   │   ├── chat.socket.ts
│   │   └── notification.socket.ts
│   └── app.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── api.md
│   └── deployment.md
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/
│   ├── seed.ts
│   └── migrate.ts
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ **Database Schema Design**

### **User Model**

```typescript
// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'patient' | 'doctor' | 'admin';
  isVerified: boolean;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
```

### **Patient Model**

```typescript
// src/models/Patient.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    surgeries: string[];
  };
  insurance: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  primaryDoctor: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatient>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  medicalHistory: {
    allergies: [String],
    medications: [String],
    conditions: [String],
    surgeries: [String]
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String
  },
  primaryDoctor: {
    type: Schema.Types.ObjectId,
    ref: 'Doctor'
  }
}, {
  timestamps: true
});

export default mongoose.model<IPatient>('Patient', PatientSchema);
```

### **Doctor Model**

```typescript
// src/models/Doctor.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  specialization: string[];
  licenseNumber: string;
  phone: string;
  hospitalAffiliations: mongoose.Types.ObjectId[];
  qualifications: {
    degree: string;
    institution: string;
    year: number;
  }[];
  experience: number;
  consultationFee: number;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  rating: number;
  totalReviews: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  specialization: [{
    type: String,
    required: true
  }],
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  hospitalAffiliations: [{
    type: Schema.Types.ObjectId,
    ref: 'Hospital'
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number
  }],
  experience: {
    type: Number,
    required: true
  },
  consultationFee: {
    type: Number,
    required: true
  },
  availability: [{
    day: String,
    startTime: String,
    endTime: String
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model<IDoctor>('Doctor', DoctorSchema);
```

### **Hospital Model**

```typescript
// src/models/Hospital.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
  phone: string;
  email: string;
  website: string;
  specialties: string[];
  facilities: string[];
  emergencyServices: boolean;
  bedCapacity: {
    total: number;
    available: number;
    icu: number;
    general: number;
  };
  rating: number;
  totalReviews: number;
  operatingHours: {
    day: string;
    open: string;
    close: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospital>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  phone: {
    type: String,
    required: true
  },
  email: String,
  website: String,
  specialties: [String],
  facilities: [String],
  emergencyServices: {
    type: Boolean,
    default: false
  },
  bedCapacity: {
    total: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    icu: { type: Number, default: 0 },
    general: { type: Number, default: 0 }
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  operatingHours: [{
    day: String,
    open: String,
    close: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create geospatial index for location queries
HospitalSchema.index({ coordinates: '2dsphere' });

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
```

### **Emergency Model**

```typescript
// src/models/Emergency.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IEmergency extends Document {
  patientId: mongoose.Types.ObjectId;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
  };
  status: 'active' | 'responding' | 'resolved' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  symptoms: string[];
  vitals: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    oxygenSaturation: number;
  };
  respondingDoctors: mongoose.Types.ObjectId[];
  emergencyContacts: {
    name: string;
    phone: string;
    relationship: string;
    notified: boolean;
    notifiedAt: Date;
  }[];
  timeline: {
    timestamp: Date;
    event: string;
    details: string;
    userId: mongoose.Types.ObjectId;
  }[];
  resolvedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmergencySchema = new Schema<IEmergency>({
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    accuracy: Number
  },
  status: {
    type: String,
    enum: ['active', 'responding', 'resolved', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'high'
  },
  symptoms: [String],
  vitals: {
    heartRate: Number,
    bloodPressure: String,
    temperature: Number,
    oxygenSaturation: Number
  },
  respondingDoctors: [{
    type: Schema.Types.ObjectId,
    ref: 'Doctor'
  }],
  emergencyContacts: [{
    name: String,
    phone: String,
    relationship: String,
    notified: { type: Boolean, default: false },
    notifiedAt: Date
  }],
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    event: String,
    details: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  resolvedAt: Date
}, {
  timestamps: true
});

export default mongoose.model<IEmergency>('Emergency', EmergencySchema);
```

---

## 🛣️ **API Routes & Controllers**

### **Authentication Controller**

```typescript
// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Patient from '../models/Patient';
import Doctor from '../models/Doctor';
import { AuthService } from '../services/auth.service';

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      const { email, password, role, ...profileData } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user
      const user = new User({ email, password, role });
      await user.save();

      // Create profile based on role
      if (role === 'patient') {
        const patient = new Patient({ userId: user._id, ...profileData });
        await patient.save();
      } else if (role === 'doctor') {
        const doctor = new Doctor({ userId: user._id, ...profileData });
        await doctor.save();
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user || !await user.comparePassword(password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // POST /api/auth/refresh
  static async refreshToken(req: Request, res: Response) {
    // Implementation for token refresh
  }

  // POST /api/auth/logout
  static async logout(req: Request, res: Response) {
    // Implementation for logout (blacklist token)
  }
}
```

### **Emergency Controller**

```typescript
// src/controllers/emergency.controller.ts
import { Request, Response } from 'express';
import Emergency from '../models/Emergency';
import { NotificationService } from '../services/notification.service';
import { SMSService } from '../services/sms.service';
import { io } from '../app';

export class EmergencyController {
  // POST /api/emergency/activate
  static async activateEmergency(req: Request, res: Response) {
    try {
      const { patientId } = req.user;
      const { location, symptoms, vitals, emergencyContacts } = req.body;

      // Create emergency record
      const emergency = new Emergency({
        patientId,
        location,
        symptoms,
        vitals,
        emergencyContacts,
        status: 'active',
        priority: 'critical',
        timeline: [{
          event: 'Emergency Activated',
          details: 'Patient activated emergency SOS',
          userId: patientId
        }]
      });

      await emergency.save();

      // Notify emergency contacts via SMS
      for (const contact of emergencyContacts) {
        await SMSService.sendEmergencyAlert(contact.phone, {
          patientName: req.user.name,
          location: location.address,
          timestamp: new Date()
        });
        
        contact.notified = true;
        contact.notifiedAt = new Date();
      }

      // Notify nearby doctors via Socket.IO
      io.emit('emergency:activated', {
        emergencyId: emergency._id,
        patientId,
        location,
        priority: emergency.priority,
        symptoms
      });

      // Send to emergency services API
      await NotificationService.notifyEmergencyServices(emergency);

      res.status(201).json({
        message: 'Emergency activated successfully',
        emergencyId: emergency._id,
        status: emergency.status
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to activate emergency' });
    }
  }

  // GET /api/emergency/active
  static async getActiveEmergencies(req: Request, res: Response) {
    try {
      const { role, userId } = req.user;

      let query = { status: { $in: ['active', 'responding'] } };
      
      if (role === 'doctor') {
        // Get emergencies for doctor's patients or nearby emergencies
        query = {
          ...query,
          $or: [
            { respondingDoctors: userId },
            { 'location.coordinates': { $near: req.user.location } }
          ]
        };
      }

      const emergencies = await Emergency.find(query)
        .populate('patientId', 'firstName lastName medicalHistory')
        .populate('respondingDoctors', 'firstName lastName specialization')
        .sort({ createdAt: -1 });

      res.json({ emergencies });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
  }

  // PUT /api/emergency/:id/respond
  static async respondToEmergency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId, role } = req.user;

      if (role !== 'doctor') {
        return res.status(403).json({ error: 'Only doctors can respond to emergencies' });
      }

      const emergency = await Emergency.findById(id);
      if (!emergency) {
        return res.status(404).json({ error: 'Emergency not found' });
      }

      // Add doctor to responding doctors
      if (!emergency.respondingDoctors.includes(userId)) {
        emergency.respondingDoctors.push(userId);
        emergency.status = 'responding';
        
        emergency.timeline.push({
          timestamp: new Date(),
          event: 'Doctor Responding',
          details: 'Doctor joined emergency response',
          userId
        });

        await emergency.save();

        // Notify patient and other doctors
        io.emit('emergency:doctor_responding', {
          emergencyId: id,
          doctorId: userId,
          status: 'responding'
        });
      }

      res.json({ message: 'Successfully responding to emergency' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to respond to emergency' });
    }
  }

  // PUT /api/emergency/:id/resolve
  static async resolveEmergency(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { resolution, notes } = req.body;

      const emergency = await Emergency.findById(id);
      if (!emergency) {
        return res.status(404).json({ error: 'Emergency not found' });
      }

      emergency.status = 'resolved';
      emergency.resolvedAt = new Date();
      emergency.timeline.push({
        timestamp: new Date(),
        event: 'Emergency Resolved',
        details: notes || 'Emergency successfully resolved',
        userId: req.user.userId
      });

      await emergency.save();

      // Notify all parties
      io.emit('emergency:resolved', {
        emergencyId: id,
        resolution,
        resolvedAt: emergency.resolvedAt
      });

      res.json({ message: 'Emergency resolved successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve emergency' });
    }
  }
}
```

### **Hospital Controller**

```typescript
// src/controllers/hospital.controller.ts
import { Request, Response } from 'express';
import Hospital from '../models/Hospital';

export class HospitalController {
  // GET /api/hospitals/nearby
  static async getNearbyHospitals(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius = 10, specialty } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
      }

      let query: any = {
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude as string), parseFloat(latitude as string)]
            },
            $maxDistance: parseInt(radius as string) * 1000 // Convert km to meters
          }
        },
        isActive: true
      };

      if (specialty) {
        query.specialties = { $in: [specialty] };
      }

      const hospitals = await Hospital.find(query)
        .select('name address phone specialties emergencyServices bedCapacity rating coordinates')
        .limit(20);

      // Calculate distances
      const hospitalsWithDistance = hospitals.map(hospital => {
        const distance = calculateDistance(
          parseFloat(latitude as string),
          parseFloat(longitude as string),
          hospital.coordinates.latitude,
          hospital.coordinates.longitude
        );

        return {
          ...hospital.toObject(),
          distance: Math.round(distance * 10) / 10 // Round to 1 decimal
        };
      });

      res.json({ hospitals: hospitalsWithDistance });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hospitals' });
    }
  }

  // GET /api/hospitals/:id
  static async getHospitalDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const hospital = await Hospital.findById(id);
      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      res.json({ hospital });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hospital details' });
    }
  }

  // PUT /api/hospitals/:id/bed-capacity
  static async updateBedCapacity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { available, icu, general } = req.body;

      const hospital = await Hospital.findByIdAndUpdate(
        id,
        {
          'bedCapacity.available': available,
          'bedCapacity.icu': icu,
          'bedCapacity.general': general
        },
        { new: true }
      );

      if (!hospital) {
        return res.status(404).json({ error: 'Hospital not found' });
      }

      res.json({ message: 'Bed capacity updated', hospital });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update bed capacity' });
    }
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### **AI Controller**

```typescript
// src/controllers/ai.controller.ts
import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import MedicalRecord from '../models/MedicalRecord';

export class AIController {
  // POST /api/ai/analyze-symptoms
  static async analyzeSymptoms(req: Request, res: Response) {
    try {
      const { symptoms, severity, duration, patientHistory } = req.body;
      const { userId } = req.user;

      // Get patient's medical history
      const medicalHistory = await MedicalRecord.find({ patientId: userId })
        .sort({ createdAt: -1 })
        .limit(10);

      // Analyze symptoms using AI service
      const analysis = await AIService.analyzeSymptoms({
        symptoms,
        severity,
        duration,
        medicalHistory: medicalHistory.map(record => ({
          diagnosis: record.diagnosis,
          medications: record.medications,
          date: record.createdAt
        })),
        patientHistory
      });

      // Save analysis to medical records
      const record = new MedicalRecord({
        patientId: userId,
        type: 'ai_analysis',
        diagnosis: analysis.primaryDiagnosis,
        symptoms,
        aiAnalysis: {
          confidence: analysis.confidence,
          recommendations: analysis.recommendations,
          urgencyLevel: analysis.urgencyLevel,
          followUpRequired: analysis.followUpRequired
        },
        createdBy: 'ai_system'
      });

      await record.save();

      res.json({
        analysis,
        recordId: record._id,
        recommendations: analysis.recommendations
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze symptoms' });
    }
  }

  // POST /api/ai/prescription-suggestions
  static async getPrescriptionSuggestions(req: Request, res: Response) {
    try {
      const { symptoms, diagnosis, allergies, currentMedications } = req.body;

      const suggestions = await AIService.generatePrescriptionSuggestions({
        symptoms,
        diagnosis,
        allergies,
        currentMedications
      });

      res.json({ suggestions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate prescription suggestions' });
    }
  }

  // POST /api/ai/chat
  static async chatWithAI(req: Request, res: Response) {
    try {
      const { message, conversationId } = req.body;
      const { userId } = req.user;

      const response = await AIService.processHealthQuery({
        message,
        userId,
        conversationId
      });

      res.json({ response });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process AI chat' });
    }
  }
}
```

---

## 🔌 **Socket.IO Implementation**

### **Emergency Socket Handler**

```typescript
// src/sockets/emergency.socket.ts
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Emergency from '../models/Emergency';

export class EmergencySocket {
  static handleConnection(io: Server, socket: Socket) {
    // Authenticate socket connection
    socket.on('authenticate', async (token: string) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;
        
        // Join role-specific rooms
        socket.join(`${decoded.role}s`);
        socket.join(`user_${decoded.userId}`);
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        socket.emit('authentication_error', { error: 'Invalid token' });
      }
    });

    // Handle emergency activation
    socket.on('emergency:activate', async (data) => {
      if (socket.userRole !== 'patient') return;

      try {
        // Broadcast to all doctors
        socket.to('doctors').emit('emergency:new', {
          emergencyId: data.emergencyId,
          patientId: socket.userId,
          location: data.location,
          priority: data.priority,
          timestamp: new Date()
        });

        // Notify emergency services
        io.emit('emergency:services', data);
      } catch (error) {
        socket.emit('emergency:error', { error: 'Failed to broadcast emergency' });
      }
    });

    // Handle doctor response
    socket.on('emergency:respond', async (data) => {
      if (socket.userRole !== 'doctor') return;

      try {
        const { emergencyId } = data;
        
        // Update emergency record
        await Emergency.findByIdAndUpdate(emergencyId, {
          $addToSet: { respondingDoctors: socket.userId },
          status: 'responding'
        });

        // Notify patient
        socket.to(`user_${data.patientId}`).emit('emergency:doctor_responding', {
          doctorId: socket.userId,
          emergencyId,
          timestamp: new Date()
        });

        // Notify other doctors
        socket.to('doctors').emit('emergency:doctor_joined', {
          doctorId: socket.userId,
          emergencyId
        });
      } catch (error) {
        socket.emit('emergency:error', { error: 'Failed to respond to emergency' });
      }
    });

    // Handle location updates
    socket.on('emergency:location_update', (data) => {
      if (socket.userRole !== 'patient') return;

      // Broadcast location update to responding doctors
      socket.to('doctors').emit('emergency:location_updated', {
        patientId: socket.userId,
        location: data.location,
        timestamp: new Date()
      });
    });
  }
}
```

---

## 📋 **Route Summary by File**

### **auth.routes.ts**

```typescript
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
POST   /api/auth/refresh           - Refresh JWT token
POST   /api/auth/logout            - User logout
POST   /api/auth/forgot-password   - Password reset request
POST   /api/auth/reset-password    - Password reset confirmation
GET    /api/auth/verify/:token     - Email verification
```

### **patient.routes.ts**

```typescript
GET    /api/patients/profile       - Get patient profile
PUT    /api/patients/profile       - Update patient profile
GET    /api/patients/dashboard     - Get dashboard data
GET    /api/patients/appointments  - Get patient appointments
POST   /api/patients/symptoms      - Submit symptom report
GET    /api/patients/records       - Get medical records
POST   /api/patients/records       - Upload medical record
```

### **doctor.routes.ts**

```typescript
GET    /api/doctors/profile        - Get doctor profile
PUT    /api/doctors/profile        - Update doctor profile
GET    /api/doctors/dashboard      - Get dashboard data
GET    /api/doctors/patients       - Get assigned patients
GET    /api/doctors/appointments   - Get doctor appointments
PUT    /api/doctors/availability   - Update availability
GET    /api/doctors/analytics      - Get performance analytics
```

### **hospital.routes.ts**

```typescript
GET    /api/hospitals/nearby       - Get nearby hospitals
GET    /api/hospitals/:id          - Get hospital details
PUT    /api/hospitals/:id/beds     - Update bed capacity
GET    /api/hospitals/search       - Search hospitals
POST   /api/hospitals              - Create hospital (admin)
PUT    /api/hospitals/:id          - Update hospital (admin)
```

### **emergency.routes.ts**

```typescript
POST   /api/emergency/activate     - Activate emergency SOS
GET    /api/emergency/active       - Get active emergencies
PUT    /api/emergency/:id/respond  - Respond to emergency
PUT    /api/emergency/:id/resolve  - Resolve emergency
GET    /api/emergency/history      - Get emergency history
POST   /api/emergency/test         - Test emergency system
```

### **prescription.routes.ts**

```typescript
GET    /api/prescriptions          - Get prescriptions
POST   /api/prescriptions          - Create prescription
PUT    /api/prescriptions/:id      - Update prescription
GET    /api/prescriptions/:id      - Get prescription details
POST   /api/prescriptions/verify   - Verify prescription code
PUT    /api/prescriptions/:id/fill - Mark prescription as filled
```

### **ai.routes.ts**

```typescript
POST   /api/ai/analyze-symptoms    - AI symptom analysis
POST   /api/ai/prescription-suggestions - AI prescription suggestions
POST   /api/ai/chat                - AI health chat
POST   /api/ai/diagnosis           - AI diagnosis assistance
GET    /api/ai/health-tips         - Personalized health tips
```

### **appointment.routes.ts**

```typescript
GET    /api/appointments           - Get appointments
POST   /api/appointments           - Book appointment
PUT    /api/appointments/:id       - Update appointment
DELETE /api/appointments/:id       - Cancel appointment
PUT    /api/appointments/:id/confirm - Confirm appointment
GET    /api/appointments/slots     - Get available slots
```

### **medical-record.routes.ts**

```typescript
GET    /api/records                - Get medical records
POST   /api/records                - Create medical record
PUT    /api/records/:id            - Update medical record
GET    /api/records/:id            - Get record details
POST   /api/records/upload         - Upload EHR file
GET    /api/records/download/:id   - Download record
```

### **chat.routes.ts**

```typescript
GET    /api/chat/conversations     - Get chat conversations
POST   /api/chat/send              - Send message
GET    /api/chat/:id/messages      - Get conversation messages
PUT    /api/chat/:id/read          - Mark messages as read
POST   /api/chat/video-call        - Initiate video call
```

### **notification.routes.ts**

```typescript
GET    /api/notifications          - Get notifications
PUT    /api/notifications/:id/read - Mark notification as read
PUT    /api/notifications/read-all - Mark all as read
POST   /api/notifications/settings - Update notification settings
GET    /api/notifications/settings - Get notification settings
```

---

## 🚀 **Deployment & Scaling Considerations**

### **Environment Configuration**

```shellscript
# .env.example
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/careconnect
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# External Services
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=careconnect-files

OPENAI_API_KEY=your-openai-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Docker Configuration**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### **Scaling Strategy**

1. **Horizontal Scaling**: Use PM2 cluster mode or Kubernetes
2. **Database Sharding**: Shard by patient ID or geographic region
3. **Caching**: Redis for session management and frequent queries
4. **CDN**: CloudFront for static assets and file downloads
5. **Load Balancing**: NGINX or AWS ALB for traffic distribution


