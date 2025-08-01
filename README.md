# Manager ERP Business Owner App

A comprehensive Enterprise Resource Planning (ERP) application designed specifically for Indian business owners to manage their entire business operations from a single mobile application.

## 🚀 Overview

The Manager ERP Business Owner App is a React Native application built with Expo that provides a complete business management solution. It enables business owners to handle sales, inventory, customer management, supplier relationships, financial tracking, and more through an intuitive mobile interface.

## ✨ Key Features

### 📊 **Dashboard & Analytics**
- Real-time business overview with key metrics
- Sales performance tracking
- Revenue and expense summaries
- Quick action buttons for common tasks
- Visual charts and progress indicators

### 🛒 **Sales Management**
- **New Sale Flow**: Product selection → Cart → Customer details → Payment
- **Customer Pre-selection**: Direct sales from customer profiles
- **Barcode Scanning**: Quick product identification
- **Payment Processing**: Multiple payment methods support
- **Invoice Generation**: Professional invoice creation
- **Sales History**: Complete transaction records

### 📦 **Inventory Management**
- **Product Catalog**: Comprehensive product database
- **Stock Tracking**: Real-time inventory levels
- **Low Stock Alerts**: Automatic notifications
- **Product Categories**: Organized product classification
- **Barcode Integration**: Scan-based product management
- **Stock Discrepancies**: Identify and resolve inventory issues
- **Manual Product Entry**: Add products with detailed specifications

### 👥 **Customer Management**
- **Customer Database**: Complete customer profiles
- **Business & Individual**: Support for both customer types
- **GSTIN Integration**: Automatic business information lookup
- **Payment Terms**: Flexible payment arrangements
- **Credit Limits**: Customer credit management
- **Sales History**: Track customer purchase patterns
- **Direct Sales**: Quick sales from customer profiles

### 🤝 **Supplier Management**
- **Supplier Database**: Comprehensive supplier profiles
- **GSTIN Verification**: Automatic business information lookup
- **Category Management**: Organized supplier classification
- **Purchase Orders**: Streamlined procurement process
- **Payment Tracking**: Supplier payment management
- **Communication**: Direct supplier messaging

### 💰 **Financial Management**
- **Receivables**: Customer payment collection
- **Payables**: Supplier payment processing
- **Expense Tracking**: Business expense management
- **Bank Account Management**: Multiple account support
- **Payment Methods**: UPI, Card, Bank Transfer support
- **Financial Reports**: Comprehensive reporting

### 📍 **Location Management**
- **Branch Management**: Multi-location business support
- **Warehouse Tracking**: Inventory location management
- **Address Management**: Complete address handling
- **Map Integration**: Location-based services

### 📈 **Marketing & Campaigns**
- **Campaign Management**: Marketing campaign creation
- **Multi-Platform Support**: WhatsApp, Email, Instagram, Facebook, Google, Offline
- **Budget Management**: Campaign budget tracking
- **Target Audience**: Precise audience targeting
- **Performance Analytics**: Campaign effectiveness tracking
- **Payment Integration**: Campaign payment processing

### 👨‍💼 **Staff Management**
- **Staff Notifications**: Bulk staff communication
- **Role-based Access**: Different permission levels
- **Staff Directory**: Complete staff profiles
- **Communication Tools**: Direct messaging capabilities

### 🔄 **Returns & Refunds**
- **Return Processing**: Streamlined return handling
- **Refund Management**: Multiple refund methods
- **Return Reasons**: Categorized return tracking
- **Customer Communication**: Automated notifications

### 📋 **Reports & Analytics**
- **Sales Reports**: Daily, weekly, monthly sales data
- **Payment Reports**: Payment collection tracking
- **Inventory Reports**: Stock level analytics
- **Customer Reports**: Customer behavior insights
- **Financial Reports**: Comprehensive financial analytics

## 🛠️ Technical Stack

### **Frontend Framework**
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and tools
- **TypeScript**: Type-safe JavaScript development

### **Navigation & Routing**
- **Expo Router**: File-based routing system
- **Deep Linking**: Seamless app navigation

### **UI/UX Components**
- **Lucide React Native**: Modern icon library
- **React Native Safe Area**: Safe area handling
- **Custom Components**: Tailored business components

### **State Management**
- **React Hooks**: Local state management
- **Context API**: Global state sharing
- **AsyncStorage**: Local data persistence

### **External Integrations**
- **GSTIN API**: Business verification services
- **MapLibre GL JS**: Map functionality
- **Camera Integration**: Barcode scanning
- **Payment Gateways**: Financial transaction processing

## 📱 App Architecture

### **Directory Structure**
```
Manager-ERP-BO/
├── app/                    # Main application screens
│   ├── auth/              # Authentication flow
│   ├── dashboard.tsx      # Main dashboard
│   ├── inventory/         # Inventory management
│   ├── new-sale/         # Sales process
│   ├── new-return/       # Returns management
│   ├── people/           # Customer & staff management
│   ├── purchasing/        # Supplier management
│   ├── receivables/       # Payment collection
│   ├── payables/         # Payment processing
│   ├── marketing/        # Marketing campaigns
│   ├── expenses/         # Expense management
│   ├── locations/        # Branch & warehouse management
│   └── reports/          # Analytics & reporting
├── components/            # Reusable UI components
├── hooks/                # Custom React hooks
├── services/             # API services
├── data/                 # Static data files
└── assets/               # Images and static assets
```

### **Key Components**

#### **FAB (Floating Action Button)**
- Central action hub for quick access
- Animated expansion with multiple options
- Context-aware actions based on current screen

#### **Hamburger Menu**
- Navigation to all major sections
- Organized by business function
- Quick access to key features

#### **Form Components**
- Consistent input styling
- Validation and error handling
- Modal-based complex inputs

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18 or higher)
- npm or yarn package manager
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Manager-ERP-BO
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

### **Environment Setup**

#### **Development Environment**
- **Expo Development Build**: For testing native features
- **Expo Go**: For rapid prototyping and testing
- **Metro Bundler**: JavaScript bundler for React Native

#### **Production Build**
```bash
# Build for iOS
npx expo build:ios

# Build for Android
npx expo build:android
```

## 📋 Business Workflows

### **Sales Process**
1. **Product Selection**: Browse or scan products
2. **Cart Management**: Add/remove items, adjust quantities
3. **Customer Details**: Select existing or add new customer
4. **Payment Processing**: Choose payment method and complete transaction
5. **Invoice Generation**: Create and send professional invoice

### **Inventory Management**
1. **Product Addition**: Manual entry or barcode scanning
2. **Category Management**: Organize products by categories
3. **Stock Tracking**: Monitor inventory levels
4. **Low Stock Alerts**: Automatic notifications for reordering
5. **Stock Reconciliation**: Identify and resolve discrepancies

### **Customer Management**
1. **Customer Registration**: Business or individual customer setup
2. **GSTIN Verification**: Automatic business information lookup
3. **Profile Management**: Complete customer profiles
4. **Sales History**: Track customer purchase patterns
5. **Direct Sales**: Quick sales from customer profiles

### **Supplier Management**
1. **Supplier Registration**: Add new suppliers with verification
2. **Purchase Orders**: Create and manage purchase orders
3. **Payment Tracking**: Monitor supplier payments
4. **Communication**: Direct messaging with suppliers

### **Financial Management**
1. **Payment Collection**: Track customer payments
2. **Expense Tracking**: Record and categorize business expenses
3. **Bank Account Management**: Multiple account support
4. **Financial Reporting**: Comprehensive financial analytics

## 🔧 Configuration

### **App Configuration**
- **app.json**: Expo configuration file
- **TypeScript**: Type definitions and interfaces
- **Navigation**: File-based routing with Expo Router

### **API Integration**
- **GSTIN API**: Business verification services
- **Payment Gateways**: Financial transaction processing
- **Map Services**: Location-based functionality

### **Data Management**
- **Local Storage**: AsyncStorage for offline data
- **State Management**: React hooks for local state
- **Data Validation**: TypeScript interfaces for data integrity

## 📊 Data Models

### **Core Entities**

#### **Product**
```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  hsnCode: string;
  barcode: string;
  price: number;
  stock: number;
  supplier: string;
  location: string;
  cessType: 'value' | 'quantity' | 'value_and_quantity';
  cessAmount: string;
  cessAmountType: 'amount' | 'percentage';
  uom: string;
  uomType: 'primary' | 'compound';
}
```

#### **Customer**
```typescript
interface Customer {
  id: string;
  name: string;
  customerType: 'business' | 'individual';
  mobile: string;
  email?: string;
  address: string;
  gstin?: string;
  businessName?: string;
  contactPerson?: string;
  paymentTerms?: string;
  creditLimit?: string;
}
```

#### **Supplier**
```typescript
interface Supplier {
  id: string;
  name: string;
  businessName: string;
  gstin: string;
  mobile: string;
  email?: string;
  address: string;
  categories: string[];
  customCategory?: string;
}
```

#### **Bank Account**
```typescript
interface BankAccount {
  id: string;
  bankId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  initialBalance: number;
  isPrimary: boolean;
}
```

## 🎨 UI/UX Features

### **Design System**
- **Consistent Color Scheme**: Primary blue (#3f66ac) with supporting colors
- **Typography**: Clear hierarchy with proper font weights
- **Spacing**: Consistent padding and margins
- **Icons**: Lucide React Native icons for consistency

### **User Experience**
- **Intuitive Navigation**: Easy-to-use interface
- **Form Validation**: Real-time input validation
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages
- **Responsive Design**: Works across different screen sizes

### **Accessibility**
- **Touch Targets**: Properly sized interactive elements
- **Color Contrast**: High contrast for readability
- **Screen Reader Support**: Proper accessibility labels

## 🔒 Security Features

### **Data Protection**
- **Input Validation**: Prevent malicious input
- **Data Encryption**: Secure storage of sensitive information
- **Session Management**: Proper authentication handling

### **Business Security**
- **GSTIN Verification**: Authentic business information
- **Payment Security**: Secure payment processing
- **Access Control**: Role-based permissions

## 📈 Performance Optimization

### **App Performance**
- **Lazy Loading**: Load components on demand
- **Image Optimization**: Compressed images for faster loading
- **State Management**: Efficient state updates
- **Memory Management**: Proper cleanup of resources

### **Network Optimization**
- **API Caching**: Reduce redundant API calls
- **Offline Support**: Basic functionality without internet
- **Data Synchronization**: Sync when connection restored

## 🧪 Testing

### **Testing Strategy**
- **Unit Testing**: Component-level testing
- **Integration Testing**: Workflow testing
- **User Acceptance Testing**: Business requirement validation

### **Quality Assurance**
- **TypeScript**: Compile-time error checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting consistency

## 📚 API Documentation

### **External APIs**

#### **GSTIN Verification API**
```typescript
// Service: services/gstinApi.ts
export const verifyGSTIN = async (gstin: string) => {
  // Returns business information from GSTIN
}
```

### **Internal APIs**

#### **Data Management**
- **Local Storage**: AsyncStorage for persistent data
- **State Management**: React hooks for application state
- **Navigation**: Expo Router for screen navigation

## 🚀 Deployment

### **Development**
```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
```

### **Production**
```bash
# Build for production
npx expo build:ios
npx expo build:android

# Publish to Expo
npx expo publish
```

## 🤝 Contributing

### **Development Guidelines**
1. **Code Style**: Follow TypeScript and ESLint rules
2. **Component Structure**: Use functional components with hooks
3. **State Management**: Use React hooks for local state
4. **Testing**: Write tests for new features
5. **Documentation**: Update README for new features

### **Pull Request Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### **Getting Help**
- **Documentation**: Check this README for common issues
- **Issues**: Report bugs through GitHub issues
- **Discussions**: Use GitHub discussions for questions

### **Business Support**
- **Feature Requests**: Submit through GitHub issues
- **Bug Reports**: Include detailed reproduction steps
- **Enhancement Suggestions**: Provide business context

## 🔄 Version History

### **Current Version**: 1.0.0
- **Initial Release**: Complete ERP functionality
- **Core Features**: Sales, inventory, customer, supplier management
- **Financial Tools**: Payment processing, expense tracking
- **Marketing**: Campaign management and analytics
- **Reporting**: Comprehensive business analytics

## 📞 Contact

For business inquiries or technical support:
- **Email**: [contact@managererp.com]
- **GitHub**: [https://github.com/your-org/manager-erp-bo]
- **Documentation**: [https://docs.managererp.com]

---

**Built with ❤️ for Indian Business Owners**
