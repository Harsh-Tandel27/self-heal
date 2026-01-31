"""
Data system package exports.
"""
from data_system.webhooks import router as webhooks_router
from data_system.error_generator import router as error_generator_router
from data_system.scenarios import router as scenarios_router

__all__ = [
    "webhooks_router",
    "error_generator_router",
    "scenarios_router",
]
