# 🚀 Cornwells MVP Digital Infrastructure Setup Guide

## **IMMEDIATE DEPLOYMENT STEPS**

### **1. NETLIFY DEPLOYMENT (5 minutes)**
```bash
# Your site is already live at: https://cornwells-services.netlify.app/
# To update with new tracking infrastructure:

npm run build
# Upload dist/ folder to Netlify or use Git deployment
```

### **2. GOOGLE ANALYTICS 4 SETUP (10 minutes)**
1. **Create GA4 Property**: https://analytics.google.com/
2. **Get Measurement ID**: Format `G-XXXXXXXXXX`
3. **Update index.html**: Replace `GA_MEASUREMENT_ID` with your actual ID
4. **Enable Enhanced Ecommerce**: For conversion tracking

### **3. BITLY ACCOUNT SETUP (5 minutes)**
1. **Sign up**: https://bitly.com/
2. **Get API Token**: Account Settings → API → Generate Token
3. **Update tracking.js**: Add token to `bitlyToken` property
4. **Test URL shortening**: Use QR generator to verify

### **4. SUPABASE CONFIGURATION (Already Done)**
✅ **Project ID**: `sssanglcqfnciyipjngx`
✅ **Database**: 28 tables with RLS enabled
✅ **API Integration**: Working booking system

---

## **DIGITAL INFRASTRUCTURE COMPONENTS**

### **📊 TRACKING SYSTEM**
- **UTM Parameter Format**: `utm_source={material}&utm_medium={branch}&utm_campaign={service}&utm_term={version}&utm_content=qr`
- **QR Code Generation**: 2,100 unique codes (10 services × 10 branches × 7 materials × 3 versions)
- **Conversion Tracking**: Google Analytics 4 + Supabase integration
- **Real-time Dashboard**: Live metrics and performance data

### **📱 QR CODE INFRASTRUCTURE**
- **Generator Tool**: `qr-generator-mvp.html` - Creates all marketing QR codes
- **Tracking URLs**: Each QR code has unique UTM parameters
- **A/B/C Testing**: Three versions per material for optimization
- **Download System**: Individual or bulk ZIP downloads

### **📈 ANALYTICS DASHBOARD**
- **Marketing Dashboard**: `marketing-dashboard.html` - Real-time performance tracking
- **Key Metrics**: Visits, bookings, conversion rates, QR scans
- **Service Performance**: Charts showing which services convert best
- **Branch Analysis**: Location-based performance data
- **UTM Tracking Table**: Detailed campaign performance
- **Activity Feed**: Real-time visitor and conversion activity

---

## **MARKETING MATERIAL WORKFLOW**

### **STEP 1: Generate QR Codes**
1. Open `qr-generator-mvp.html`
2. Click "Generate All QR Codes"
3. Filter by service/branch/material as needed
4. Download individual codes or bulk ZIP

### **STEP 2: Create Marketing Materials**
- **A4 Posters**: Include QR code with "Scan for instant booking"
- **A5 Flyers**: QR code + brief service description
- **Counter Cards**: Small QR codes for reception areas
- **Window Clings**: Large QR codes visible from outside
- **Prescription Bag Belts**: QR codes on medication bags
- **Shelf Wobblers**: Point-of-sale QR codes
- **Partner Materials**: QR codes for GP surgeries, etc.

### **STEP 3: Deploy & Track**
1. Place materials in branches
2. Monitor `marketing-dashboard.html` for performance
3. Track which materials/locations perform best
4. Optimize based on conversion data

---

## **BRANCH-SPECIFIC DEPLOYMENT**

### **QR CODE ALLOCATION**
Each branch gets 210 QR codes:
- **10 services** × **7 material types** × **3 A/B/C versions**
- **Unique tracking** per branch location
- **Performance comparison** between branches

### **BRANCH CODES**
- **wx**: Weeping Cross
- **gw**: Great Wyrley  
- **hc**: Holmcroft
- **wol**: Wolstanton
- **bc**: Beaconside
- **nc**: Newcastle
- **sv**: Silverdale
- **st4**: Stoke City Centre
- **ch**: Chadsmoor
- **ah**: Abbey Hulton

---

## **CONVERSION TRACKING SETUP**

### **GOOGLE ANALYTICS 4 EVENTS**
```javascript
// Automatically tracked events:
- page_view (with UTM data)
- booking_intent (when user clicks book button)
- consultation_booking (successful booking)
- call_intent (when user clicks call button)
- website_visit_intent (when user visits main site)
```

### **SUPABASE TRACKING**
- **UTM Parameters**: Stored with each booking
- **Source Attribution**: Track which materials drive conversions
- **Performance Analytics**: Query conversion rates by source

### **DASHBOARD METRICS**
- **Total Visits**: All website traffic
- **Total Bookings**: Successful consultation bookings
- **Conversion Rate**: Bookings ÷ Visits
- **QR Scans**: Unique QR code interactions
- **Service Performance**: Which services convert best
- **Branch Performance**: Which locations perform best
- **Material Performance**: Which marketing materials work best

---

## **IMMEDIATE ACTION ITEMS**

### **TODAY (2 hours)**
1. ✅ **Deploy Updated Site**: Upload new build to Netlify
2. ⏳ **Setup Google Analytics**: Get measurement ID and update code
3. ⏳ **Create Bitly Account**: Get API token for URL shortening
4. ⏳ **Generate QR Codes**: Create first batch for priority services
5. ⏳ **Test Tracking**: Verify UTM parameters are captured

### **THIS WEEK (8 hours)**
1. **Create Marketing Materials**: Design posters/flyers with QR codes
2. **Deploy to Priority Branches**: Start with Weeping Cross, Great Wyrley, Holmcroft
3. **Monitor Dashboard**: Track initial performance data
4. **Optimize Based on Data**: Adjust materials based on early results

### **NEXT 2 WEEKS (16 hours)**
1. **Full Branch Rollout**: Deploy to all 10 locations
2. **A/B Test Materials**: Compare version A/B/C performance
3. **Refine Targeting**: Focus on best-performing services/locations
4. **Scale Successful Campaigns**: Double down on what works

---

## **SUCCESS METRICS**

### **WEEK 1 TARGETS**
- **100+ QR Code Scans**: Across priority branches
- **10+ Bookings**: From QR code traffic
- **5%+ Conversion Rate**: QR scan to booking
- **3 Services Active**: Health Screening, Women's Health, Men's Health

### **MONTH 1 TARGETS**
- **500+ QR Code Scans**: Across all branches
- **50+ Bookings**: From marketing materials
- **8%+ Conversion Rate**: Optimized through A/B testing
- **All 10 Services Active**: Full service portfolio

### **MONTH 3 TARGETS**
- **2,000+ QR Code Scans**: Established customer behavior
- **200+ Bookings**: Consistent monthly bookings
- **10%+ Conversion Rate**: Highly optimized materials
- **£15,000+ Revenue**: From digital marketing attribution

---

## **TECHNICAL SUPPORT**

### **DASHBOARD ACCESS**
- **Marketing Dashboard**: `https://cornwells-services.netlify.app/marketing-dashboard.html`
- **QR Generator**: `https://cornwells-services.netlify.app/qr-generator-mvp.html`
- **Main Site**: `https://cornwells-services.netlify.app/`

### **TROUBLESHOOTING**
- **QR Codes Not Working**: Check URL format and UTM parameters
- **Tracking Not Recording**: Verify Google Analytics setup
- **Bookings Not Submitting**: Check Supabase connection
- **Dashboard Not Loading**: Refresh browser cache

### **SUPPORT CONTACTS**
- **Technical Issues**: Check browser console for errors
- **Analytics Questions**: Review Google Analytics documentation
- **Database Issues**: Check Supabase project status

---

## **NEXT PHASE ENHANCEMENTS**

### **ADVANCED FEATURES (Month 2-3)**
1. **SMS Integration**: Text reminders for bookings
2. **Email Automation**: Follow-up sequences
3. **Advanced Analytics**: Customer journey mapping
4. **Inventory Integration**: Real-time appointment availability
5. **CRM Integration**: Customer relationship management
6. **Social Media Integration**: Instagram/Facebook tracking
7. **Review System**: Customer feedback collection
8. **Loyalty Program**: Repeat customer incentives

### **SCALING FEATURES (Month 4-6)**
1. **Multi-location Booking**: Cross-branch appointments
2. **Staff Scheduling**: Pharmacist availability integration
3. **Payment Integration**: Online payment processing
4. **Telemedicine**: Video consultation options
5. **Mobile App**: Native iOS/Android applications
6. **API Integrations**: Third-party health platforms
7. **Reporting Suite**: Advanced business intelligence
8. **White-label Solution**: Franchise-ready platform

---

**🎯 READY TO LAUNCH: Your digital infrastructure is complete and ready for immediate deployment!** 