import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Download,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileCode,
  Layers,
  Sparkles,
  Play,
  Usb,
  Cpu,
} from 'lucide-react';
import { soundManager } from '../services/audio';

interface AndroidStudioExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidStudioExportModal: React.FC<AndroidStudioExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'usb-install' | 'ready-project' | 'why-failed' | 'manual-code'>('usb-install');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    soundManager.playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const codeManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:label="SkyWin BD"
        android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  const codeMainActivity = `package com.aviator.crash;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private long backPressedTime;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Dark status bar
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#070a12"));
            window.setNavigationBarColor(Color.parseColor("#0a0e18"));
        }

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Hardware acceleration for smooth 60fps plane animations
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setBackgroundColor(Color.parseColor("#070a12"));

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        // Load Live Server URL (Online Real-time Auto Update - No APK recompile needed!)
        webView.loadUrl("https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app");

        // Native back button handling
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    if (backPressedTime + 2000 > System.currentTimeMillis()) {
                        finish();
                    } else {
                        Toast.makeText(MainActivity.this, "অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন", Toast.LENGTH_SHORT).show();
                    }
                    backPressedTime = System.currentTimeMillis();
                }
            }
        });
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-lg bg-[#0e1422] border border-[#22314a] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-[#172033] via-[#131b2e] to-[#0e1422] border-b border-[#212f45] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Usb className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                Android Studio ও ক্যাবল দিয়ে ফোনে ইনস্টল
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  সরাসরি ফিক্স
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ক্যাবল কানেক্ট করে ফোনে সরাসরি ইনস্টল ও সবুজ Run ▶️ বাটনের সমাধান
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-[#1b2538] hover:bg-[#25334d] text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 bg-[#0a0f18] p-1.5 border-b border-[#1b2639] gap-1 text-[11px] font-bold">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('usb-install');
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'usb-install'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141d2d]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>ক্যাবল ও Run ▶️</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('ready-project');
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'ready-project'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141d2d]'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>প্রজেক্ট জিপ</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('why-failed');
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'why-failed'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141d2d]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>অপশন গায়েব কেন?</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('manual-code');
            }}
            className={`py-2 px-1 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'manual-code'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141d2d]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>জাভা কোড</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: USB INSTALL & RUN BUTTON GUIDE */}
          {activeTab === 'usb-install' && (
            <div className="space-y-3.5">
              <div className="bg-gradient-to-r from-emerald-950/60 to-[#0e1d2c] border border-emerald-500/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Play className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  <span>ক্যাবল কানেক্ট করে সরাসরি ফোনে ইনস্টল করার নিশ্চিত নিয়ম:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  আগে আপনি যেভাবে অ্যান্ড্রয়েড স্টুডিওতে ফোন কানেক্ট করে সরাসরি সবুজ <strong>Run ▶️ (Shift+F10)</strong> বাটনে চাপ দিয়ে ফোনে ইনস্টল করে নিতেন — ঠিক সেভাবেই ইনস্টল করার জন্য নিচের ধাপগুলো মেনে চলুন:
                </p>
              </div>

              {/* Step by step for USB run */}
              <div className="bg-[#121929] border border-[#1e2a3f] rounded-2xl p-3.5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ১
                  </span>
                  <div>
                    <h5 className="font-bold text-white text-xs">সরাসরি প্রস্তুতকৃত অ্যান্ড্রয়েড প্রজেক্ট জিপ ডাউনলোড করুন</h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      নিচের সবুজ বাটনে চাপ দিয়ে <strong>Aviator-Android-Studio-Project.zip</strong> ডাউনলোড করে আপনার কম্পিউটারে Extract (আনজিপ) করুন।
                    </p>
                    <a
                      href="/aviator-android-studio-project.zip"
                      download="Aviator-Android-Studio-Project.zip"
                      onClick={() => soundManager.playClick()}
                      className="inline-flex items-center gap-1.5 mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ডাউনলোড করুন Aviator-Android-Studio.zip</span>
                    </a>
                  </div>
                </div>

                <div className="border-t border-[#1e273b] pt-2.5 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ২
                  </span>
                  <div>
                    <h5 className="font-bold text-white text-xs">Android Studio তে শুধু 'Aviator-Android-Studio' ফোল্ডার ওপেন করুন</h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Android Studio চালু করে <strong>File ➔ Open</strong> চাপুন এবং আনজিপ করা <strong>Aviator-Android-Studio</strong> ফোল্ডারটি সিলেক্ট করুন। (যদি "Trust Project" জানতে চায়, <strong>"Trust Project"</strong> দিন)।
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1e273b] pt-2.5 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ৩
                  </span>
                  <div>
                    <h5 className="font-bold text-white text-xs">ফোনে USB Debugging ও 'File Transfer' নিশ্চিত করুন</h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ১. ফোনে ক্যাবল লাগালে নোটিফিকেশনে <strong>"Charging only"</strong> এর বদলে <strong>"File Transfer / MTP"</strong> সিলেক্ট করুন।<br />
                      ২. ফোনের স্ক্রিনে যদি <strong>"Allow USB debugging?"</strong> পপআপ আসে, <strong>"Always allow from this computer"</strong> টিক দিয়ে <strong>"Allow"</strong> চাপুন।<br />
                      ৩. শাওমি/রেডমি ফোনে Developer Options থেকে <strong>"Install via USB"</strong> অন রাখুন।
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#1e273b] pt-2.5 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    ৪
                  </span>
                  <div>
                    <h5 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                      <span>এবার উপরে আপনার ফোনের নাম ও সবুজ Run ▶️ বাটন আসবে!</span>
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Android Studio এর উপরের ড্রপডাউনে আপনার ফোনের নাম সিলেক্ট করে শুধু সবুজ <strong>Run ▶️ (Shift+F10)</strong> চাপুন। কয়েক সেকেন্ডের মধ্যে ক্যাবল দিয়ে অ্যাপটি সরাসরি আপনার ফোনে ইনস্টল হয়ে ওপেন হয়ে যাবে!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: READY PROJECT DOWNLOAD */}
          {activeTab === 'ready-project' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/40 border border-emerald-600/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>রেডিমেড প্রজেক্ট জিপে সবকিছু কনফিগার করা আছে</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Gradle Wrapper, Android SDK 34, MainActivity, Layout, Manifest ও প্রি-বিল্ড করা অফলাইন অ্যাসেটস সব জিপ ফাইলে সাজিয়ে দেওয়া আছে।
                </p>
              </div>

              {/* Download Buttons */}
              <div className="space-y-2.5">
                <a
                  href="/aviator-android-studio-project.zip"
                  download="Aviator-Android-Studio-Project.zip"
                  onClick={() => soundManager.playClick()}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>📥 Android Studio প্রজেক্ট ডাউনলোড করুন (.zip)</span>
                </a>

                <a
                  href="/aviator-full-source-code.zip"
                  download="Aviator-Full-Source-Code.zip"
                  onClick={() => soundManager.playClick()}
                  className="w-full py-3 px-4 bg-[#162032] hover:bg-[#1e2c45] border border-[#273854] text-slate-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>📦 সম্পূর্ণ সোর্স কোড ডাউনলোড (.zip)</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: WHY THE OPTION DISAPPEARED */}
          {activeTab === 'why-failed' && (
            <div className="space-y-3.5">
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>কেন অ্যান্ড্রয়েড স্টুডিওতে ফোনে ইনস্টল করার অপশন পাচ্ছিলেন না?</span>
                </div>
                
                <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <p>
                    ❌ <strong>১. মূল ওয়েব রুট ফোল্ডার ওপেন করার কারণে:</strong><br />
                    আপনি এতদিন যেগুলোতে ফোনে ক্যাবল দিয়ে রান করেছেন সেগুলো ছিল খাঁটি অ্যান্ড্রয়েড প্রোজেক্ট। কিন্তু এটি একটি React ওয়েব প্রোজেক্ট। আপনি যদি রুট ফোল্ডার ওপেন করেন, অ্যান্ড্রয়েড স্টুডিও কোনো <strong>Runnable App Module</strong> খুঁজে পায় না। ফলে উপরে <strong>"Edit Configurations..."</strong> লেখা থাকে এবং সবুজ Run ▶️ বাটন ও ফোনের তালিকা গায়েব হয়ে থাকে!
                  </p>
                  
                  <p>
                    ❌ <strong>২. "Safe Mode" এ ওপেন থাকা:</strong><br />
                    প্রোজেক্টটি প্রথমবার খোলার পর যদি "Trust Project" এ চাপ না দিয়ে থাকেন, তবে Android Studio এটিকে Safe Mode এ রাখে এবং সব USB ডিবাগিং ও রান অপশন বন্ধ করে দেয়।
                  </p>

                  <p>
                    ❌ <strong>৩. ফোনের USB মোড:</strong><br />
                    ক্যাবল লাগানোর পর ফোনে যদি শুধু "Charging" মোড অন থাকে অথবা ফোনের স্ক্রিনে আসা "Allow USB debugging from this computer?" এ "Allow" চাপ না দেওয়া হয়, তবে Android Studio ফোনটিকে সনাক্ত করতে পারে না।
                  </p>
                </div>
              </div>

              <div className="bg-[#121929] border border-[#1e2a3f] rounded-2xl p-3.5">
                <h5 className="text-emerald-400 font-bold text-xs mb-1">সমাধান কী?</h5>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  আমাদের প্রস্তুত করা <strong>Aviator-Android-Studio.zip</strong> ডাউনলোড করে ওপেন করুন। এতে সরাসরি <code className="bg-black/50 px-1 py-0.5 rounded text-emerald-300">:app</code> মডিউল ও গ্রেডল র‍্যাপার অন্তর্ভুক্ত থাকায় অ্যান্ড্রয়েড স্টুডিও এটিকে সঙ্গে সঙ্গে আপনার আগের পরিচিত নেটিভ অ্যাপ হিসেবে চিনবে এবং সবুজ Run ▶️ বাটন চালু করে দেবে!
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: MANUAL JAVA & MANIFEST CODE */}
          {activeTab === 'manual-code' && (
            <div className="space-y-3.5">
              <p className="text-[11px] text-slate-300">
                আপনি যদি নিজের পূর্বের যেকোনো পরিচিত Android Studio প্রজেক্টে এই কোড পেস্ট করে ফোনে ক্যাবল দিয়ে রান করতে চান:
              </p>

              {/* MainActivity.java */}
              <div className="bg-[#0b101a] border border-[#1e293c] rounded-2xl overflow-hidden">
                <div className="bg-[#141b2a] px-3 py-2 flex items-center justify-between border-b border-[#1e293c]">
                  <span className="font-mono text-[11px] text-sky-400 font-bold">MainActivity.java</span>
                  <button
                    onClick={() => handleCopy('main_activity', codeMainActivity)}
                    className="flex items-center gap-1 text-[10px] font-bold bg-[#1e293c] hover:bg-[#283850] text-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedKey === 'main_activity' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 leading-relaxed">
                  {codeMainActivity}
                </pre>
              </div>

              {/* AndroidManifest.xml */}
              <div className="bg-[#0b101a] border border-[#1e293c] rounded-2xl overflow-hidden">
                <div className="bg-[#141b2a] px-3 py-2 flex items-center justify-between border-b border-[#1e293c]">
                  <span className="font-mono text-[11px] text-amber-400 font-bold">AndroidManifest.xml</span>
                  <button
                    onClick={() => handleCopy('manifest', codeManifest)}
                    className="flex items-center gap-1 text-[10px] font-bold bg-[#1e293c] hover:bg-[#283850] text-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedKey === 'manifest' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-36 leading-relaxed">
                  {codeManifest}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0a0e17] border-t border-[#1e273b] flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>USB Debugging • Run 'app' (Shift+F10) Ready</span>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-[#1b2538] hover:bg-[#25334d] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
