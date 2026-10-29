import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:30000,fullyParallel:true,reporter:'list',use:{channel:'chrome',headless:true,viewport:{width:1440,height:1000}},workers:3});
