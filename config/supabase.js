import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sssanglcqfnciyipjngx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzc2FuZ2xjcWZuY2l5aXBqbmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1ODgyNjIsImV4cCI6MjA2NDE2NDI2Mn0.L97-7NcxKWpMoMxVKTeOSL7VRt-U7cq2uk3MgjF1sz0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service type mapping for database storage
export const SERVICE_TYPES = {
  'metabolic-weight': 'Metabolic & Weight Management',
  'womens-health': 'Women\'s Health Services',
  'health-screening': 'Health Screening & Monitoring',
  'vaccinations': 'Core Vaccinations',
  'nhs-services': 'NHS Clinical Services',
  'mens-health': 'Men\'s Health & Performance',
  'travel-health': 'Travel Health Services',
  'gut-health': 'Gut Health & Digestive Wellness'
};

// Time slot mapping
export const TIME_SLOTS = {
  'Morning (9am-12pm)': 'morning',
  'Afternoon (12pm-5pm)': 'afternoon',
  'Evening (5pm-7pm)': 'evening'
}; 