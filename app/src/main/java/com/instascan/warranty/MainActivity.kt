package com.instascan.warranty

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.instascan.warranty.ui.InstaPayApp
import com.instascan.warranty.ui.theme.InstaPayTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            InstaPayTheme {
                InstaPayApp()
            }
        }
    }
}
