"""
GroceryListProcessor - Main orchestrator for the grocery list parsing system
"""

from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging
from grocery_organizer.src.input_parsing.input_parser import InputParser
from grocery_organizer.src.output_formatting.output_formatter import OutputFormatter

from grocery_organizer.src.store_api.api import KrogerAPI


class GroceryListProcessor:
    """
    Main processor that coordinates the entire grocery list parsing workflow.

    Orchestrates:
    1. Handwriting recognition and text extraction
    2. Item parsing and standardization
    3. Store API lookups for aisle locations
    4. Final grocery list generation and formatting
    """

    def __init__(self, file, store, output_format):
        self.file=file
        self.store=store
        self.output_format=output_format

    def process_list(self):
        # Parse file
        parser=InputParser(self.file)
        grocery_list=parser.text_parser()

        # Call API
        api_client = KrogerAPI()

        product_data = []
        for item in grocery_list:
            product_data.append(api_client.find_product(item))

        formatter=OutputFormatter(product_data, self.output_format)

        # Format list
        return formatter.format_output()


