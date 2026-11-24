package com.instascan.warranty.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp

/** Sign-in draft: register, or use the app offline (AI calling still works without an account). */
@Composable
fun SignInScreen(onRegister: () -> Unit, onUseOffline: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 48.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        AppLogo(size = 96.dp)
        Spacer(Modifier.height(16.dp))
        Text(
            text = "InstaScan",
            style = MaterialTheme.typography.displaySmall,
            fontWeight = FontWeight.Bold,
            textDecoration = TextDecoration.Underline,
        )
        Spacer(Modifier.height(32.dp))
        // TODO: real registration (Firebase Auth) comes later; this just continues for now.
        Button(onClick = onRegister, modifier = Modifier.fillMaxWidth()) {
            Text("Register!")
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onUseOffline, modifier = Modifier.fillMaxWidth()) {
            Text("Use it offline")
        }
    }
}
