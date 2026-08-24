package com.example

import android.app.Application
import com.example.data.db.AppDatabase
import com.example.data.repository.PharmacyRepository

class POSApotekApp : Application() {
    val database: AppDatabase by lazy { AppDatabase.getDatabase(this) }
    val repository: PharmacyRepository by lazy { PharmacyRepository(database) }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: POSApotekApp
            private set
    }
}
